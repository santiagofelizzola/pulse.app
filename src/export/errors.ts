// Where an export gave up. Carried through to the UI because "something went wrong" is not a
// debuggable report — the stage narrows a failure to one of five very different causes without
// the coach needing to read a stack trace.
export type ExportStage =
  | 'prepare' // clearing/creating the cache directory
  | 'capture' // rendering the artifact and rasterizing it
  | 'write' // copying the image to its coach-visible filename
  | 'share' // handing the file to the OS share sheet

const STAGE_LABELS: Record<ExportStage, string> = {
  prepare: 'preparing storage',
  capture: 'rendering the image',
  write: 'saving the file',
  share: 'opening the share sheet',
}

/**
 * The coach backed out of an export in progress. Not a failure — callers show nothing.
 */
export class ExportCancelledError extends Error {
  constructor() {
    super('Export cancelled')
    this.name = 'ExportCancelledError'
  }
}

export function isExportCancelled(error: unknown): boolean {
  if (error instanceof ExportCancelledError) return true
  return error instanceof ExportError && error.cause instanceof ExportCancelledError
}

export class ExportError extends Error {
  readonly stage: ExportStage
  readonly cause: unknown

  constructor(stage: ExportStage, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    super(`Export failed while ${STAGE_LABELS[stage]}: ${detail}`)
    this.name = 'ExportError'
    this.stage = stage
    this.cause = cause
  }
}

/**
 * Runs one stage, tagging anything it throws with where it happened. Also logs the original
 * error — the tagged message reaches the coach, the full error reaches the console.
 */
export async function stage<T>(name: ExportStage, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    console.error(`[export] stage "${name}" failed`, error)
    throw new ExportError(name, error)
  }
}

/** Short, coach-facing sentence for a failed export. */
export function exportErrorMessage(error: unknown): string {
  if (error instanceof ExportError) {
    return `Couldn't export while ${STAGE_LABELS[error.stage]}. Try again.`
  }
  return 'Something went wrong preparing the file. Try again.'
}
