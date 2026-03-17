require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { pool } = require("./config/db");

async function clearDatabase() {
  const client = await pool.connect();

  try {
    console.log("Clearing voting data...");

    await client.query("BEGIN");

    // remove vote/payment records
    await client.query("DELETE FROM votes");
    await client.query("DELETE FROM payments");

    // reset nominee totals
    await client.query(`
      UPDATE nominees
      SET votes = 0,
          amount_made = 0
    `);

    // reset sequences
    await client.query("ALTER SEQUENCE votes_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE payments_id_seq RESTART WITH 1");

    await client.query("COMMIT");

    console.log("Votes, payments, and nominee totals reset successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Clear failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

clearDatabase();