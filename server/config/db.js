// const sqlite3 = require("sqlite3").verbose();
// const path = require("path");

// const dbPath = path.join(__dirname, "../../voting.db");

// const { pool } = require("../config/db");new sqlite3.Database(dbPath, (err) => {
//   if (err) {
//     console.error("Database connection error:", err.message);
//   } else {
//     console.log("Connected to SQLite database.");
//   }
// });

// module.exports = db;


require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

console.log("DB URL loaded:", connectionString ? "YES" : "NO");

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = { pool };