import type { RefObject } from 'react'
import type { View } from 'react-native'
import { randomUUID } from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import { captureRef } from 'react-native-view-shot'

const THUMBNAILS_DIR = `${FileSystem.documentDirectory}thumbnails/`

// documentDirectory embeds the iOS data-container UUID, which rotates on reinstall/relaunch
// even though the directory's contents carry forward — so only the bare filename is persisted
// (activities.thumbnail_uri), and the absolute path is rebuilt here at read time against
// whatever the *current* documentDirectory is.
export function resolveThumbnailUri(filename: string): string {
  return `${THUMBNAILS_DIR}${filename}`
}

// Idempotent: given either a bare filename or a (possibly stale, absolute) legacy URI, returns
// just the filename. Used both to read old rows and to avoid ever re-persisting an absolute path.
export function thumbnailFilename(uriOrFilename: string): string {
  return uriOrFilename.split('/').pop()!
}

// Captures the composited canvas view (Skia canvas + the RN player-marker overlay drawn on
// top of it) into a permanent local file, so the activity's Library thumbnail includes
// everything the coach actually drew — not just what Skia itself rendered.
export async function captureCanvasThumbnail(ref: RefObject<View | null>): Promise<string> {
  const tmpUri = await captureRef(ref, { format: 'png', quality: 0.8 })

  const dirInfo = await FileSystem.getInfoAsync(THUMBNAILS_DIR)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(THUMBNAILS_DIR, { intermediates: true })
  }

  const filename = `thumb-${randomUUID()}.png`
  await FileSystem.copyAsync({ from: tmpUri, to: `${THUMBNAILS_DIR}${filename}` })
  return filename
}
