import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite'

import * as migration001 from './migrations/001_initial'

const DATABASE_NAME = 'pulse.db'

const migrations = [migration001]

let db: SQLiteDatabase | null = null

function runMigrations(database: SQLiteDatabase) {
  const { user_version: currentVersion } = database.getFirstSync<{ user_version: number }>(
    'PRAGMA user_version'
  )!

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      migration.up(database)
      database.execSync(`PRAGMA user_version = ${migration.version}`)
    }
  }
}

export function getDatabase(): SQLiteDatabase {
  if (db) return db

  db = openDatabaseSync(DATABASE_NAME)
  db.execSync('PRAGMA foreign_keys = ON')
  runMigrations(db)

  return db
}
