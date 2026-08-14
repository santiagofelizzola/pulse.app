import type { SQLiteDatabase } from 'expo-sqlite'

export const version = 8

export function up(db: SQLiteDatabase) {
  // label_display replaces the show_role_labels boolean, which was this same choice with only two
  // of the three members. The ALTER needs a constant default (SQLite won't take an expression), so
  // the backfill is a second statement: every existing lineup keeps rendering exactly what it
  // rendered before, and only lineups created from here on get the new 'blank' default.
  //
  // show_role_labels itself is left in place and stops being read or written — dropping a column
  // is a table rebuild for a few bytes of dead data, and it's the source this backfill reads.
  db.execSync(`
    ALTER TABLE lineups ADD COLUMN label_display TEXT NOT NULL DEFAULT 'blank';
    UPDATE lineups SET label_display = CASE WHEN show_role_labels = 0 THEN 'blank' ELSE 'position' END;
  `)

  // Shirt numbers need no migration of their own: they live on LineupPosition inside the
  // `positions` JSON blob, so existing rows deserialize with shirtNumber undefined — which is
  // exactly the "not assigned yet" state assignShirtNumbers fills.
}
