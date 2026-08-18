import { spacing, typography } from '../../../theme/theme'

// The artifact's own layout constants, in points at capture time.
//
// Type scale rule: nothing carrying content may render smaller than 1/26th of the artifact
// width. At the 1080px target that is a 41px floor — which is typography.callout (15pt) laid out
// at ~390pt wide on a 3x device. So the artifact uses the app's real presets, one step up from
// where the app itself uses them, and only the footer sits below the floor.
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
