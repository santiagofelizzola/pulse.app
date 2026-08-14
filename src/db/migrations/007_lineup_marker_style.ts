import type { SQLiteDatabase } from 'expo-sqlite'

export const version = 7

export function up(db: SQLiteDatabase) {
  // Constant default, so existing rows backfill to the original circle marker in place.
  db.execSync(`
    ALTER TABLE lineups ADD COLUMN marker_style TEXT NOT NULL DEFAULT 'circle';
  `)
}
