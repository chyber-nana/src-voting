require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { pool } = require("./config/db");

async function clearDatabase() {
  const client = await pool.connect();

  try {
    console.log("Clearing database...");

    await client.query("BEGIN");

    await client.query("DELETE FROM votes");
    await client.query("DELETE FROM payments");

    await client.query("ALTER SEQUENCE votes_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE payments_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE nominees_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE categories_id_seq RESTART WITH 1");

    await client.query("COMMIT");

    console.log("Database cleared successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Clear failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

clearDatabase();