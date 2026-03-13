const { pool } = require("../config/db");require("./config/db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS nominees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      votes INTEGER DEFAULT 0,
      amount_made REAL DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nominee_id INTEGER NOT NULL,
      voter_name TEXT,
      voter_class TEXT,
      votes_count INTEGER DEFAULT 1,
      amount_paid REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (nominee_id) REFERENCES nominees(id)
    )
  `);

  console.log("Database tables created.");
});

db.close();