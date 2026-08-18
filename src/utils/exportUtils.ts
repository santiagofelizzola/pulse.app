import { stage } from '../export/errors'
import { renderAndCapture, setExportStatus } from '../export/exportHost'
import { fileSize, publishExportFile, resetExportsDir, toSafeBasename } from '../export/files'
import { LIGHT_EXPORT_PALETTE } from '../export/palette'
import { shareFile, SharingUnavailableError } from '../export/share'
import { activitySpec } from '../export/specs'
import type { ExportOptions, ExportResult } from '../export/types'
import type { Activity } from '../types'

export { SharingUnavailableError } from '../export/share'
export { ExportError, exportErrorMessage } from '../export/errors'
export type { ExportStage } from '../export/errors'
export type { ExportDetail, ExportOptions, ExportResult } from '../export/types'

/**
 * Exports a single activity as a PNG and hands it to the native share sheet.
 *
 * Screens call this; they never touch view-shot, expo-print or expo-sharing themselves. The
 * capture layer stays separate from the templates so a future web/cloud export path can reuse
 * the templates and swap only capture/share.
 *
 * Every step runs inside stage(), so a failure reports WHICH step broke rather than a single
 * undifferentiated "something went wrong".
 *
 * Resolving does NOT mean the coach sent anything — neither platform reports the chosen
 * destination or a cancel (see share.ts), so callers must not show a success confirmation.
 */
export async function exportActivity(activity: Activity, options: ExportOptions): Promise<ExportResult> {
  const palette = options.palette ?? LIGHT_EXPORT_PALETTE

  setExportStatus('Preparing export...')

  try {
    // Clears the PREVIOUS run's artifacts, never this one's — see resetExportsDir.
    await stage('prepare', () => resetExportsDir())

    const capture = await stage('capture', () => renderAndCapture(activitySpec(activity, options.detail, palette)))

    const result = await stage('write', async () => {
      const basename = toSafeBasename(activity.name, 'Pulse activity')
      const uri = await publishExportFile(capture.uri, basename, 'png')
      return { uri, widthPx: capture.widthPx, heightPx: capture.heightPx, byteSize: await fileSize(uri) }
    })

    console.log(
      `[export] activity "${activity.name}" -> ${result.widthPx}x${result.heightPx}px, ` +
        `${(result.byteSize / 1024).toFixed(0)}KB`
    )

    await stage('share', () => shareFile(result.uri, 'png', 'Share activity'))

    return result
  } finally {
    setExportStatus(null)
  }
}

export function isSharingUnavailable(error: unknown): boolean {
  if (error instanceof SharingUnavailableError) return true
  return (
    typeof error === 'object' &&
    error !== null &&
    'cause' in error &&
    (error as { cause: unknown }).cause instanceof SharingUnavailableError
  )
}
