import { stage } from '../export/errors'
import { renderAndCapture, setExportStatus } from '../export/exportHost'
import { fileSize, publishExportFile, resetExportsDir, toSafeBasename } from '../export/files'
import { LIGHT_EXPORT_PALETTE } from '../export/palette'
import { shareFile, SharingUnavailableError } from '../export/share'
import { activitySpec, lineupSpec } from '../export/specs'
import type {
  ActivityArtifactInput,
  ExportOptions,
  ExportResult,
  LineupArtifactInput,
} from '../export/types'
import type { RenderSpec } from '../export/exportHost'

export { SharingUnavailableError } from '../export/share'
export { ExportError, exportErrorMessage } from '../export/errors'
export type { ExportStage } from '../export/errors'
export type {
  ActivityArtifactInput,
  ExportDetail,
  ExportOptions,
  ExportResult,
  LineupArtifactInput,
} from '../export/types'

interface ImageExportRequest {
  spec: RenderSpec
  // Coach-visible filename, before the extension. Empty falls back to `fallbackName`.
  name: string
  fallbackName: string
  dialogTitle: string
  logLabel: string
}

/**
 * The shared image-export pipeline: prepare -> render+capture -> name the file -> share.
 *
 * Every step runs inside stage(), so a failure reports WHICH step broke rather than a single
 * undifferentiated "something went wrong".
 *
 * Resolving does NOT mean the coach sent anything — neither platform reports the chosen
 * destination or a cancel (see share.ts), so callers must not show a success confirmation.
 */
async function exportImage({
  spec,
  name,
  fallbackName,
  dialogTitle,
  logLabel,
}: ImageExportRequest): Promise<ExportResult> {
  setExportStatus('Preparing export...')

  try {
    // Clears the PREVIOUS run's artifacts, never this one's — see resetExportsDir.
    await stage('prepare', () => resetExportsDir())

    const capture = await stage('capture', () => renderAndCapture(spec))

    const result = await stage('write', async () => {
      const uri = await publishExportFile(capture.uri, toSafeBasename(name, fallbackName), 'png')
      return { uri, widthPx: capture.widthPx, heightPx: capture.heightPx, byteSize: await fileSize(uri) }
    })

    console.log(
      `[export] ${logLabel} -> ${result.widthPx}x${result.heightPx}px, ${(result.byteSize / 1024).toFixed(0)}KB`
    )

    await stage('share', () => shareFile(result.uri, 'png', dialogTitle))

    return result
  } finally {
    setExportStatus(null)
  }
}

/**
 * Exports a drill as a PNG and hands it to the native share sheet.
 *
 * Takes the presentational fields, not a saved Activity, so a drill still on the canvas exports
 * through exactly the same path as one in the library — see ActivityArtifactInput. An empty
 * `name` is legitimate: the artifact simply carries no title.
 */
export async function exportActivity(activity: ActivityArtifactInput, options: ExportOptions): Promise<ExportResult> {
  const palette = options.palette ?? LIGHT_EXPORT_PALETTE
  return exportImage({
    spec: activitySpec(activity, options.detail, palette),
    name: activity.name,
    fallbackName: 'Pulse drill',
    dialogTitle: 'Share drill',
    logLabel: `activity "${activity.name || 'untitled'}"`,
  })
}

/**
 * Exports a lineup as a PNG. Same narrowing as above: LineupEditorScreen holds all of these in
 * state whether or not the lineup has been saved, so an in-progress lineup is not a special case.
 */
export async function exportLineup(lineup: LineupArtifactInput, options: ExportOptions): Promise<ExportResult> {
  const palette = options.palette ?? LIGHT_EXPORT_PALETTE
  return exportImage({
    spec: lineupSpec(lineup, options.detail, palette),
    // No " lineup" suffix: a coach who called it "Test lineup" got "Test lineup lineup.png".
    name: lineup.name,
    fallbackName: 'Pulse lineup',
    dialogTitle: 'Share lineup',
    logLabel: `lineup "${lineup.name || 'untitled'}"`,
  })
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
