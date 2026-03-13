const { pool } = require("../config/db");

// Fetch all pending
const getQueue = async (req, res) => {
  const query = `
    SELECT v.*, n.name AS nominee_name
    FROM votes v
    LEFT JOIN nominees n ON v.nominee_id = n.id
    WHERE v.status = 'pending'
    ORDER BY v.id DESC
  `;

  try {
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch admin stats
const getStats = async (req, res) => {
  try {
    const pendingResult = await pool.query(`
      SELECT COUNT(*) AS "pendingCount"
      FROM votes
      WHERE status = 'pending'
    `);

    const revenueResult = await pool.query(`
      SELECT COALESCE(SUM(amount_paid), 0) AS revenue
      FROM votes
      WHERE status = 'approved'
    `);

    res.json({
      pendingCount: Number(pendingResult.rows[0].pendingCount),
      revenue: Number(revenueResult.rows[0].revenue)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Verify action
const verifyVote = async (req, res) => {
  const { id, status } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (status === "rejected") {
      await client.query(
        "UPDATE votes SET status = 'rejected' WHERE id = $1",
        [id]
      );

      await client.query("COMMIT");
      return res.json({ success: true, message: "Vote rejected" });
    }

    const voteResult = await client.query(
      "SELECT nominee_id, votes_count, amount_paid FROM votes WHERE id = $1",
      [id]
    );

    const row = voteResult.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return res.status(404).send("Record not found");
    }

    await client.query(
      "UPDATE votes SET status = 'approved' WHERE id = $1",
      [id]
    );

    await client.query(
      `UPDATE nominees
       SET votes = votes + $1,
           amount_made = amount_made + $2
       WHERE id = $3`,
      [row.votes_count, row.amount_paid, row.nominee_id]
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "Vote approved and added!" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).send("Database error");
  } finally {
    client.release();
  }
};

module.exports = { getQueue, getStats, verifyVote };