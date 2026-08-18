import * as FileSystem from 'expo-file-system/legacy'

// Exports are disposable artifacts, not library content — they live in the CACHE directory so
// the OS can reclaim them under pressure and they never inflate the app's backed-up documents.
// (Thumbnails, which the library genuinely needs, stay in documentDirectory — see
// utils/thumbnailUtils.ts.)
const EXPORTS_DIR = `${FileSystem.cacheDirectory}exports/`

// Characters that break a filename on one platform or the other. Spaces, hyphens and accented
// letters are deliberately KEPT — this string is what the coach reads in the share sheet, so
// "Rondo 4v2.png" beats "rondo4v2.png".
//
// A Set rather than a regex character class, on purpose. Every regex spelling of this list puts
// a hyphen or a slash next to other punctuation, where one misplaced character silently turns a
// literal into a range and eats every space in every filename. A set of single characters
// cannot be misparsed.
const RESERVED_FILENAME_CHARS = new Set(['/', '\\', ':', '*', '?', '"', '<', '>', '|'])
const MAX_BASENAME_LENGTH = 60

function stripUnsafe(name: string): string {
  let out = ''
  for (const char of name) {
    if (RESERVED_FILENAME_CHARS.has(char)) continue
    if ((char.codePointAt(0) ?? 0) < 0x20) continue // control characters
    out += char
  }
  return out
}

/**
 * Turns a coach-entered name into something safe to sit on disk and legible in a share sheet.
 * Leading/trailing dots and spaces are stripped last, after truncation, because truncating can
 * itself expose one.
 */
export function toSafeBasename(name: string, fallback: string): string {
  const cleaned = stripUnsafe(name)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_BASENAME_LENGTH)
    .replace(/^[.\s]+/, '')
    .replace(/[.\s]+$/, '')

  return cleaned.length > 0 ? cleaned : fallback
}

/**
 * Wipes and recreates the export directory. Called at the START of every export run rather than
 * after a share completes: on iOS, Sharing.shareAsync can resolve before AirDrop/Mail has
 * finished reading the file off disk, so deleting on completion produces intermittently empty
 * attachments. Cleaning up on the next run means at most one export's worth of cache lingers.
 */
export async function resetExportsDir(): Promise<void> {
  await FileSystem.deleteAsync(EXPORTS_DIR, { idempotent: true })
  await FileSystem.makeDirectoryAsync(EXPORTS_DIR, { intermediates: true })
}

/** Absolute path for a named artifact inside the exports directory. */
export function exportFileUri(basename: string, extension: string): string {
  return `${EXPORTS_DIR}${basename}.${extension}`
}

/**
 * Puts a freshly produced file (view-shot's tmpfile, expo-print's randomly named PDF) at the
 * coach-visible filename. Without this the share sheet shows a UUID or "Print.pdf".
 *
 * COPY, not move. view-shot returns RCTTempFilePath's path, which lives in the app container's
 * tmp/ directory — expo-file-system grants read there but not the delete a move also needs, so
 * moveAsync fails while copyAsync succeeds. This mirrors captureCanvasThumbnail, which has been
 * copying out of the same directory since Session 3.
 *
 * The source is then deleted best-effort: it is the OS's temp directory, so failing to clean it
 * up is not worth failing an export over.
 */
export async function publishExportFile(fromUri: string, basename: string, extension: string): Promise<string> {
  const to = exportFileUri(basename, extension)
  await FileSystem.deleteAsync(to, { idempotent: true })
  await FileSystem.copyAsync({ from: fromUri, to })
  try {
    await FileSystem.deleteAsync(fromUri, { idempotent: true })
  } catch {
    // Temp file, OS-managed — leaving it behind is harmless.
  }
  return to
}

/**
 * Best-effort sweep of leftover exports, for app start.
 *
 * An export that was shared and then abandoned leaves its file behind until the NEXT export runs
 * (see resetExportsDir for why cleanup cannot happen on completion). Without this, a coach who
 * exports once and never again keeps that file indefinitely. Never throws — a failed cleanup of
 * a cache directory must not stop the app from launching.
 */
export async function clearStaleExports(): Promise<void> {
  try {
    await FileSystem.deleteAsync(EXPORTS_DIR, { idempotent: true })
  } catch {
    // Cache directory; the OS reclaims it under pressure regardless.
  }
}

export async function fileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri)
  return info.exists && !info.isDirectory ? info.size : 0
}
