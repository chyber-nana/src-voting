const { pool } = require("../config/db");

const submitVote = async (req, res) => {
  const { votes, transId, voter_phone } = req.body;

  if (!votes || !Array.isArray(votes) || votes.length === 0) {
    return res.status(400).json({ error: "No valid votes provided." });
  }

  for (const v of votes) {
    if (!v.nominee_id) {
      return res.status(400).json({
        error: "nominee_id is required for all votes."
      });
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const vote of votes) {
      await client.query(
        `INSERT INTO votes (
          voter_phone,
          nominee_id,
          nominee_name,
          votes_count,
          amount_paid,
          momo_trans_id,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [
          voter_phone || "Unknown",
          vote.nominee_id,
          vote.nomineeName,
          vote.nomineeVotes,
          vote.amount_paid,
          transId
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Database failure" });
  } finally {
    client.release();
  }
};

module.exports = { submitVote };