import type { SQLiteDatabase } from 'expo-sqlite'

export const version = 5

// Historically thumbnail_uri stored an absolute file:// path built from documentDirectory, which
// embeds the iOS data-container UUID — that UUID rotates on reinstall/relaunch even though the
// Documents contents carry forward, so every previously-saved path went stale while the actual
// PNG files remained on disk under the new container. From here on only the bare filename is
// stored (see thumbnailUtils.resolveThumbnailUri), so this rewrites existing rows to match.
//
// Idempotent: a row already holding a bare filename has no '/' to split on, so extracting the
// last path segment returns the same string and the guard below skips writing it back. Safe to
// run more than once. Only touches thumbnail_uri — canvas_data is never read or written here.
export function up(db: SQLiteDatabase) {
  const rows = db.getAllSync<{ id: string; thumbnail_uri: string | null }>(
    'SELECT id, thumbnail_uri FROM activities WHERE thumbnail_uri IS NOT NULL'
  )

  for (const row of rows) {
    const filename = row.thumbnail_uri!.split('/').pop()!
    if (filename === row.thumbnail_uri) continue
    db.runSync('UPDATE activities SET thumbnail_uri = ? WHERE id = ?', filename, row.id)
  }
}
