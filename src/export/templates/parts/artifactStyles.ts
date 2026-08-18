import { spacing, typography } from '../../../theme/theme'

// The width a diagram is RENDERED at before being scaled into its slot — near the ~360pt the
// editor lays the canvas out at, because every piece of canvas geometry is in absolute points:
// 30pt markers, 26pt equipment, 2pt pitch lines, a 20pt pitch margin, 13-14pt label text. Drawing
// straight into a 200pt slot therefore does not shrink a pitch, it inflates everything on it —
// markers jump from 8% of pitch width to 12% and the inner margin becomes a fat white gap. So the
// diagram is drawn at this size and the RESULT is scaled, which is the rule the rest of the
// export already follows.
export const DIAGRAM_REFERENCE_WIDTH = 360

export const artifactLayout = {
  padding: spacing.xl,
  // Gap between the diagram and the metadata that follows it.
  blockGap: spacing.xl,
  rowGap: spacing.md,
  // The pitch keeps a hairline edge so it reads as a bounded field rather than bleeding into
  // the artifact's white background — the same role CanvasScreen's canvasBox border plays.
  diagramBorderWidth: 1,
} as const

export const artifactType = {
  title: typography.h1,
  sectionLabel: typography.label,
  body: typography.callout,
  meta: typography.label,
  overline: typography.overline,
  footer: typography.caption,
} as const
