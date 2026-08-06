import type { SQLiteDatabase } from 'expo-sqlite'

export const version = 1

export function up(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS activities (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      tag              TEXT,
      duration_minutes INTEGER,
      notes            TEXT,
      canvas_data      TEXT NOT NULL,        -- JSON (CanvasData)
      thumbnail_uri    TEXT,                 -- local file path
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id                     TEXT PRIMARY KEY,
      name                   TEXT NOT NULL,
      total_duration_minutes INTEGER NOT NULL DEFAULT 0,
      created_at             TEXT NOT NULL,
      updated_at             TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_activities (
      id                TEXT PRIMARY KEY,
      session_id        TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      activity_id       TEXT NOT NULL REFERENCES activities(id),
      position          INTEGER NOT NULL,
      block_type        TEXT NOT NULL,
      coaching_points   TEXT,
      duration_override INTEGER,
      UNIQUE(session_id, position)
    );
    CREATE INDEX IF NOT EXISTS idx_sa_session_id ON session_activities(session_id);

    CREATE TABLE IF NOT EXISTS lineups (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      match_date  TEXT,
      squad_size  INTEGER NOT NULL,          -- 7, 9, or 11
      formation   TEXT,
      background  TEXT NOT NULL DEFAULT 'full-pitch',
      positions   TEXT NOT NULL,             -- JSON (LineupPosition[])
      notes       TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `)
}
