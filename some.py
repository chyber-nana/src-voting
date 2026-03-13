import sqlite3

# 1. Connect to the database (it will create the file if it doesn't exist)
conn = sqlite3.connect('voting.db')
cursor = conn.cursor()

# 2. Define the SQL command
create_table_query = """
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT UNIQUE NOT NULL,
  nominee_id INTEGER NOT NULL,
  votes_count INTEGER NOT NULL,
  amount_paid REAL NOT NULL,
  voter_name TEXT,
  voter_class TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

# 3. Execute and close
cursor.execute(create_table_query)
conn.commit()
conn.close()

print("Database and table created successfully!")