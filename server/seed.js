// const { pool } = require("../config/db");require("./config/db");

// console.log("Resetting votes and total money...");

// db.serialize(() => {

//   db.run(`
//     UPDATE nominees
//     SET votes = 0,
//         amount_made = 0
//   `, (err) => {

//     if (err) {
//       console.error("Error resetting nominees:", err.message);
//       process.exit(1);
//     }

//     console.log("Nominee votes and amounts reset.");

//   });

//   db.run(`DELETE FROM votes`, (err) => {

//     if (err) {
//       console.error("Error deleting votes:", err.message);
//       process.exit(1);
//     }

//     console.log("Votes table cleared.");

//     console.log("Database reset complete.");
//     process.exit(0);

//   });

// });


// const { pool } = require("../config/db");require("./config/db");

// // Use db.serialize to ensure commands run in order
// db.serialize(() => {
//   // 1. Drop the table
//   db.run("DROP TABLE IF EXISTS payments");

//   // 2. Create the table
//   db.run(`
//     CREATE TABLE payments (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       reference TEXT UNIQUE NOT NULL,
//       votes_count INTEGER NOT NULL,
//       amount_paid REAL NOT NULL,
//       voter_name TEXT,
//       voter_class TEXT,
//       status TEXT NOT NULL DEFAULT 'pending',
//       metadata TEXT,
//       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
//     )
//   `, (err) => {
//     if (err) {
//       console.error("Error creating table:", err.message);
//     } else {
//       console.log("Payments table recreated successfully with metadata support!");
//     }
//     process.exit();
//   });
// });

// Add to your migrate.js
// db.run(`
//   CREATE TABLE IF NOT EXISTS votes (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     nominee_id INTEGER NOT NULL,
//     voter_name TEXT,
//     voter_class TEXT,
//     votes_count INTEGER,
//     amount_paid REAL
//   )
// `);

// const sqlite3 = require('sqlite3').verbose();
// const { pool } = require("../config/db");new sqlite3.Database('./voting.db');

// db.run("ALTER TABLE votes ADD COLUMN status TEXT DEFAULT 'pending'", (err) => {
//     if (err) console.log("Error (column might already exist):", err.message);
//     else console.log("Successfully added 'status' column!");
// });

// const sqlite3 = require('sqlite3').verbose();
// const { pool } = require("../config/db");new sqlite3.Database('./voting.db');

// db.serialize(() => {
//     console.log("🛠️ Synchronizing database schema...");

//     const columnsToAdd = [
//         "ALTER TABLE votes ADD COLUMN voter_phone TEXT",
//         "ALTER TABLE votes ADD COLUMN nominee_name TEXT",
//         "ALTER TABLE votes ADD COLUMN momo_trans_id TEXT"
//     ];

//     columnsToAdd.forEach(query => {
//         db.run(query, (err) => {
//             if (err) console.log(`⚠️ Note: ${err.message.split(':').pop().trim()}`);
//             else console.log(`✅ Column added successfully.`);
//         });
//     });

//     console.log("🚀 Sync complete. Restart your server now.");
// });

// const bcrypt = require('bcrypt');
// bcrypt.hash("{@b0tw3SRC}", 10).then(console.log)

// require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
// console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
// require("dotenv").config();
// const { pool } = require("../server/config/db");

// async function testConnection() {
//   const result = await pool.query("SELECT NOW()");
//   console.log("Connected to Postgres at:", result.rows[0].now);
// }


// async function initDb() {
//   try {
//     await testConnection();
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS categories (
//         id SERIAL PRIMARY KEY,
//         name TEXT NOT NULL UNIQUE
//       );
//     `);

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS nominees (
//         id SERIAL PRIMARY KEY,
//         name TEXT NOT NULL,
//         category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
//         votes INTEGER NOT NULL DEFAULT 0,
//         amount_made NUMERIC(12,2) NOT NULL DEFAULT 0
//       );
//     `);

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS votes (
//         id SERIAL PRIMARY KEY,
//         voter_phone TEXT,
//         voter_name TEXT,
//         voter_class TEXT,
//         nominee_id INTEGER REFERENCES nominees(id) ON DELETE CASCADE,
//         nominee_name TEXT,
//         votes_count INTEGER NOT NULL DEFAULT 0,
//         amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
//         momo_trans_id TEXT,
//         status TEXT NOT NULL DEFAULT 'pending',
//         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS payments (
//         id SERIAL PRIMARY KEY,
//         reference TEXT NOT NULL UNIQUE,
//         votes_count INTEGER NOT NULL DEFAULT 0,
//         amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
//         voter_name TEXT,
//         voter_class TEXT,
//         status TEXT NOT NULL DEFAULT 'pending',
//         metadata TEXT,
//         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS user_sessions (
//         sid varchar NOT NULL COLLATE "default",
//         sess json NOT NULL,
//         expire timestamp(6) NOT NULL
//       );
//     `);

//     await pool.query(`
//       ALTER TABLE user_sessions
//       DROP CONSTRAINT IF EXISTS session_pkey;
//     `);

//     await pool.query(`
//       ALTER TABLE user_sessions
//       ADD CONSTRAINT session_pkey PRIMARY KEY (sid);
//     `);

//     await pool.query(`
//       CREATE INDEX IF NOT EXISTS IDX_session_expire
//       ON user_sessions (expire);
//     `);

//     console.log("Database tables created successfully.");
//   } catch (err) {
//     console.error("Database setup failed:", err);
//   } finally {
//     await pool.end();
//   }
// }

// initDb();

// require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
// const { pool } = require("./config/db");

// const categories = [
//   "Face of Botwe",
//   "Fattest wallet",
//   "Geyhey Headboy",
//   "Holico Headboy",
//   "Syte Headboy",
//   "Most Hyped",
//   "Friend group of the year",
//   "Personality of the year",
//   "Club of the year",
//   "Prefect of the year",
//   "Man Botwe",
//   "Best Photographer",
//   "Best Sportsman",
//   "Most Creative",
//   "Gentleman of the Year",
//   "Best Duo",
//   "Artiste of the Year",
//   "Dancer of the Year",
//   "Most Photogenic",
//   "Nickname of the Year"
// ];

// async function seedCategories() {
//   const client = await pool.connect();

//   try {
//     console.log("Seeding categories...");
//     await client.query("BEGIN");

//     for (const name of categories) {
//       await client.query(
//         `
//         INSERT INTO categories (name)
//         VALUES ($1)
//         ON CONFLICT (name) DO NOTHING
//         `,
//         [name]
//       );
//     }

//     await client.query("COMMIT");
//     console.log("Categories seeded successfully.");
//   } catch (err) {
//     await client.query("ROLLBACK");
//     console.error("Seeding failed:", err);
//   } finally {
//     client.release();
//     await pool.end();
//   }
// }

// seedCategories();


require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { pool } = require("./config/db");

const updateNomineesTable = async () => {
  try {
    // PostgreSQL uses a slightly different syntax for ADD COLUMN IF NOT EXISTS
    // but the logic remains the same.
    const query = `
      ALTER TABLE nominees 
      ADD COLUMN IF NOT EXISTS votes INTEGER NOT NULL DEFAULT 0;
    `;

    await pool.query(query);
    console.log("✅ Nominees table updated: 'votes' column added.");
    
  } catch (err) {
    console.error("❌ Error updating nominees table:", err.message);
  } finally {
    // Close the pool connection so the script can exit
    await pool.end();
  }
};

updateNomineesTable();