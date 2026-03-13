const axios = require("axios");
const crypto = require("crypto");
const { pool } = require("../config/db");

function generateReference() {
  return `bulk_vote_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

const processSuccessfulPayment = async (paymentRow) => {
  const votesDetail = JSON.parse(paymentRow.metadata);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE payments SET status = 'paid' WHERE reference = $1",
      [paymentRow.reference]
    );

    for (const vote of votesDetail) {
      console.log("Processing vote:", vote);

      const nomineeId = parseInt(vote.nominee_id || vote.id);

      if (!nomineeId) {
        console.error("CRITICAL: Nominee ID missing for vote:", vote);
        continue;
      }

      const votesCount = parseInt(vote.nomineeVotes);
      const amountForThisNominee = votesCount * 1;

      await client.query(
        `INSERT INTO votes (
          nominee_id,
          nominee_name,
          voter_name,
          voter_class,
          votes_count,
          amount_paid,
          momo_trans_id,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          nomineeId,
          vote.nomineeName || "",
          paymentRow.voter_name || "Anonymous",
          paymentRow.voter_class || "N/A",
          votesCount,
          amountForThisNominee,
          paymentRow.reference,
          "pending"
        ]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const initializePayment = async (req, res) => {
  const { votes, voter_name, voter_class } = req.body;

  if (!votes || !Array.isArray(votes) || votes.length === 0) {
    return res.status(400).json({ error: "A list of votes is required" });
  }

  const totalVotesCount = votes.reduce((sum, v) => sum + Number(v.nomineeVotes), 0);
  const totalAmountPaid = totalVotesCount * 1;
  const amountInPesewas = Math.round(totalAmountPaid * 100);
  const reference = generateReference();
  const votesMetadata = JSON.stringify(votes);

  try {
    await pool.query(
      `INSERT INTO payments (reference, votes_count, amount_paid, voter_name, voter_class, status, metadata)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
      [reference, totalVotesCount, totalAmountPaid, voter_name || "", voter_class || "", votesMetadata]
    );

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: "votes@yourdomain.com",
        amount: amountInPesewas,
        reference,
        callback_url: process.env.PAYSTACK_CALLBACK_URL,
        metadata: { votes, voter_name, voter_class }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({
      authorization_url: response.data.data.authorization_url,
      reference
    });
  } catch (error) {
    return res.status(500).json({ error: error.response?.data || error.message });
  }
};

const verifyPayment = async (req, res) => {
  const { reference } = req.params;

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      }
    );

    const tx = response.data.data;
    if (tx.status !== "success") return res.json({ status: tx.status });

    const paymentResult = await pool.query(
      "SELECT * FROM payments WHERE reference = $1",
      [reference]
    );

    const paymentRow = paymentResult.rows[0];

    if (!paymentRow) {
      return res.status(404).json({ error: "Record not found" });
    }

    if (paymentRow.status === "paid") {
      return res.json({ status: "success", message: "Already processed" });
    }

    await processSuccessfulPayment(paymentRow);
    return res.json({ status: "success", message: "Bulk votes added!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const paystackWebhook = async (req, res) => {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Invalid signature");
  }

  const event = JSON.parse(req.body.toString());

  if (event.event === "charge.success") {
    const reference = event.data.reference;

    try {
      const paymentResult = await pool.query(
        "SELECT * FROM payments WHERE reference = $1",
        [reference]
      );

      const paymentRow = paymentResult.rows[0];

      if (paymentRow && paymentRow.status !== "paid") {
        await processSuccessfulPayment(paymentRow);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return res.sendStatus(200);
};

const getPaymentSummary = async (req, res) => {
  const { reference } = req.params;

  try {
    const result = await pool.query(
      "SELECT metadata FROM payments WHERE reference = $1",
      [reference]
    );

    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: "Not found" });

    res.json({ votes: JSON.parse(row.metadata) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  paystackWebhook,
  getPaymentSummary
};