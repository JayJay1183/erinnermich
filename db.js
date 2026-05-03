const sqlite3 = require("sqlite3").verbose();

const DB_PATH = process.env.DB_PATH || "./appointments.db";
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      location TEXT,
      notes TEXT,
      start_time TEXT NOT NULL,
      reminder_60_sent INTEGER DEFAULT 0,
      reminder_30_sent INTEGER DEFAULT 0,
      reminder_15_sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      summary_date TEXT UNIQUE NOT NULL,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;
