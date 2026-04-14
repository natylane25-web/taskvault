const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'taskvault.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password      TEXT NOT NULL,
    role          TEXT DEFAULT 'user',
    balance       REAL DEFAULT 0,
    total_earned  REAL DEFAULT 0,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by   INTEGER REFERENCES users(id),
    is_active     INTEGER DEFAULT 1,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    category        TEXT NOT NULL,
    reward          REAL NOT NULL,
    time_minutes    INTEGER NOT NULL,
    url             TEXT,
    is_active       INTEGER DEFAULT 1,
    max_completions INTEGER DEFAULT 9999,
    completions     INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS task_completions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    task_id      INTEGER NOT NULL REFERENCES tasks(id),
    status       TEXT DEFAULT 'approved',
    reward       REAL NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, task_id)
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL REFERENCES users(id),
    referred_id INTEGER NOT NULL REFERENCES users(id),
    reward      REAL DEFAULT 3.00,
    paid        INTEGER DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    amount       REAL NOT NULL,
    method       TEXT NOT NULL,
    account      TEXT NOT NULL,
    status       TEXT DEFAULT 'pending',
    notes        TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    type        TEXT NOT NULL,
    amount      REAL NOT NULL,
    description TEXT NOT NULL,
    ref_id      INTEGER,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
