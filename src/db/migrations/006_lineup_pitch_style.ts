import type { SQLiteDatabase } from 'expo-sqlite'

export const version = 6

export function up(db: SQLiteDatabase) {
  // Constant default, so existing rows backfill to the original white pitch in place.
  db.execSync(`
    ALTER TABLE lineups ADD COLUMN pitch_style TEXT NOT NULL DEFAULT 'white';
  `)
}
