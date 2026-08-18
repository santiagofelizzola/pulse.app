import type { Activity, BlockType, Lineup, Session } from '../types'

// How much of a subject's metadata the artifact carries. 'simple' is the diagram plus a name —
// the version a coach drops into a team chat; 'full' adds every populated field.
//
// Deliberately one renderer with an optional metadata block rather than two template files:
// two templates drift, and every "full" section already hides itself when its field is empty,
// so 'full' on a bare activity degrades to 'simple' rather than showing empty headers.
export type ExportDetail = 'simple' | 'full'

// Discriminated so the render host can hold any pending job in one field, and so adding the
// session/lineup subjects in later phases is a new member here plus a new template — the host,
// the capture layer and the share layer never learn which subject they're handling.
export type ExportSubject =
  | { kind: 'activity'; activity: Activity }
  | { kind: 'lineup'; lineup: Lineup }
  | { kind: 'session'; session: Session }

export interface ExportOptions {
  detail: ExportDetail
  // Explicit rather than read from theme.ts inside the templates. Dark mode is deferred and
  // app.json pins userInterfaceStyle to light, so today there is exactly one palette and no
  // runtime branch — but taking it as an argument means a future choice is a parameter, not a
  // refactor of every template.
  palette?: ExportPalette
}

// The subset of theme tokens the export templates are allowed to use. Templates never import
// `colors` directly; they read this. Note this is NOT the pitch's appearance — a lineup's
// pitchStyle/markerStyle are saved per-lineup data and stay driven by the record, so a future
// dark export palette can never silently repaint a coach's white pitch green.
export interface ExportPalette {
  background: string
  surface: string
  surfaceSunken: string
  textPrimary: string
  textSecondary: string
  border: string
  borderSubtle: string
  accent: string
  block: Record<BlockType, { base: string; tint: string }>
}

export interface ExportResult {
  // file:// URI in the cache directory, named as the coach will see it in the share sheet.
  uri: string
  // What actually came out, after the downscale-only normalization in capture.ts — logged at
  // the checkpoint so the real numbers can be checked against the plan's estimates.
  widthPx: number
  heightPx: number
  byteSize: number
}
