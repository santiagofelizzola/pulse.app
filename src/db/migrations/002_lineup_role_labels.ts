import type { SQLiteDatabase } from 'expo-sqlite'

export const version = 2

export function up(db: SQLiteDatabase) {
  db.execSync(`
    ALTER TABLE lineups ADD COLUMN show_role_labels INTEGER NOT NULL DEFAULT 1;
  `)
}
