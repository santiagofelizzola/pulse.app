import type { SQLiteDatabase } from 'expo-sqlite'

export const version = 3

export function up(db: SQLiteDatabase) {
  db.execSync(`
    ALTER TABLE activities ADD COLUMN player_count INTEGER;
    ALTER TABLE activities ADD COLUMN player_actions TEXT;

    ALTER TABLE sessions ADD COLUMN focus TEXT;
    ALTER TABLE sessions ADD COLUMN player_count INTEGER;
    ALTER TABLE sessions ADD COLUMN coaching_moments TEXT;

    ALTER TABLE lineups ADD COLUMN subs TEXT NOT NULL DEFAULT '[]';
  `)
}
