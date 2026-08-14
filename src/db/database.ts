import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite'

import * as migration001 from './migrations/001_initial'
import * as migration002 from './migrations/002_lineup_role_labels'
import * as migration003 from './migrations/003_planning_fields'
import * as migration004 from './migrations/004_lineup_marker_colors'
import * as migration005 from './migrations/005_thumbnail_relative_paths'
import * as migration006 from './migrations/006_lineup_pitch_style'
import * as migration007 from './migrations/007_lineup_marker_style'

const DATABASE_NAME = 'pulse.db'

const migrations = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
]

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
