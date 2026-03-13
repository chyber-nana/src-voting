require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
require("dotenv").config();
const { pool } = require("../server/config/db");

async function testConnection() {
  const result = await pool.query("SELECT NOW()");
  console.log("Connected to Postgres at:", result.rows[0].now);
}


async function initDb() {
  try {
    await testConnection();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS nominees (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        votes INTEGER NOT NULL DEFAULT 0,
        amount_made NUMERIC(12,2) NOT NULL DEFAULT 0
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        voter_phone TEXT,
        voter_name TEXT,
        voter_class TEXT,
        nominee_id INTEGER REFERENCES nominees(id) ON DELETE CASCADE,
        nominee_name TEXT,
        votes_count INTEGER NOT NULL DEFAULT 0,
        amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
        momo_trans_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        reference TEXT NOT NULL UNIQUE,
        votes_count INTEGER NOT NULL DEFAULT 0,
        amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
        voter_name TEXT,
        voter_class TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        metadata TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      );
    `);

    await pool.query(`
      ALTER TABLE user_sessions
      DROP CONSTRAINT IF EXISTS session_pkey;
    `);

    await pool.query(`
      ALTER TABLE user_sessions
      ADD CONSTRAINT session_pkey PRIMARY KEY (sid);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS IDX_session_expire
      ON user_sessions (expire);
    `);

    console.log("Database tables created successfully.");
  } catch (err) {
    console.error("Database setup failed:", err);
  } finally {
    await pool.end();
  }
}

initDb();