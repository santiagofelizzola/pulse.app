import type { SQLiteDatabase } from 'expo-sqlite'

export const version = 4

export function up(db: SQLiteDatabase) {
  db.execSync(`
    ALTER TABLE lineups ADD COLUMN team_color TEXT;
    ALTER TABLE lineups ADD COLUMN keeper_color TEXT;
  `)
}
