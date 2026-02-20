import Database from 'better-sqlite3'
import path from 'path'

const dbPath = process.env.DB_PATH || './speak.db'
export const db = new Database(path.resolve(dbPath))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS practice_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('drill', 'conversation')),
    topic TEXT,
    avg_score REAL,
    sentence_count INTEGER DEFAULT 0,
    completed_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('assistant', 'user')),
    text TEXT NOT NULL,
    score REAL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS user_stats (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    streak_days INTEGER DEFAULT 0,
    last_practice_date TEXT,
    xp_en INTEGER DEFAULT 0,
    xp_de INTEGER DEFAULT 0,
    xp_fr INTEGER DEFAULT 0,
    xp_es INTEGER DEFAULT 0
  );
`)

// Clean up expired sessions on startup
db.prepare(`DELETE FROM auth_sessions WHERE expires_at < unixepoch()`).run()

export default db