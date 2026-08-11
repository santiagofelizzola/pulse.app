import type { RefObject } from 'react'
import type { View } from 'react-native'
import { randomUUID } from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import { captureRef } from 'react-native-view-shot'

const THUMBNAILS_DIR = `${FileSystem.documentDirectory}thumbnails/`

// Captures the composited canvas view (Skia canvas + the RN player-marker overlay drawn on
// top of it) into a permanent local file, so the activity's Library thumbnail includes
// everything the coach actually drew — not just what Skia itself rendered.
export async function captureCanvasThumbnail(ref: RefObject<View | null>): Promise<string> {
  const tmpUri = await captureRef(ref, { format: 'png', quality: 0.8 })

  const dirInfo = await FileSystem.getInfoAsync(THUMBNAILS_DIR)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(THUMBNAILS_DIR, { intermediates: true })
  }

  const destUri = `${THUMBNAILS_DIR}thumb-${randomUUID()}.png`
  await FileSystem.copyAsync({ from: tmpUri, to: destUri })
  return destUri
}
