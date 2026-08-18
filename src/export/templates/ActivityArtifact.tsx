import { StyleSheet, Text, View } from 'react-native'

import { CanvasDiagram } from '../../screens/Canvas/components/CanvasDiagram'
import { getPitchAspectRatio } from '../../screens/Canvas/components/PitchBackground'
import { spacing } from '../../theme/theme'
import { activityTagLabel } from '../../utils/activityTags'
import type { ActivityArtifactInput, ExportDetail, ExportPalette } from '../types'
import { artifactLayout, artifactType } from './parts/artifactStyles'
import { ArtifactFooter } from './parts/ArtifactFooter'
import { MetaRow } from './parts/MetaRow'
import { NotesBlock } from './parts/NotesBlock'
import { ScaledDiagram } from './parts/ScaledDiagram'

interface ActivityArtifactProps {
  activity: ActivityArtifactInput
  detail: ExportDetail
  palette: ExportPalette
  width: number
}

const TITLE_BLOCK_HEIGHT = 52
const FOOTER_HEIGHT = 44
const META_ROW_HEIGHT = 38
const NOTES_LINE_HEIGHT = 22
const NOTES_LABEL_HEIGHT = 24
// A pessimistic characters-per-line at artifact width, used only to predict the artifact's height.
const NOTES_CHARS_PER_LINE = 46

function estimateNotesHeight(body: string | undefined): number {
  if (!body?.trim()) return 0
  const lines = Math.ceil(body.trim().length / NOTES_CHARS_PER_LINE)
  return NOTES_LABEL_HEIGHT + lines * NOTES_LINE_HEIGHT + spacing.lg
}

// Everything other than the diagram. Zero for 'simple', which is nothing but the diagram.
function chromeHeight(activity: ActivityArtifactInput, detail: ExportDetail): number {
  if (detail !== 'full') return 0

  let height = artifactLayout.padding * 2 + artifactLayout.blockGap + FOOTER_HEIGHT
  if (activity.name.trim()) height += TITLE_BLOCK_HEIGHT
  if (activity.tag || activity.durationMinutes || activity.playerCount) height += META_ROW_HEIGHT
  height += estimateNotesHeight(activity.notes)
  height += estimateNotesHeight(activity.playerActions)
  return height
}

/**
 * The artifact's height at a given width.
 *
 * The diagram is ALWAYS the full artifact width at the true aspect of its background — the same
 * shape the editor draws, whether that is a tall full pitch (68:105) or a landscape third. Only
 * 'full' adds metadata, below, and the artifact simply gets taller.
 */
export function measureActivityArtifact(
  activity: ActivityArtifactInput,
  detail: ExportDetail,
  width: number
): number {
  const diagramWidth = detail === 'full' ? width - artifactLayout.padding * 2 : width
  return diagramWidth / getPitchAspectRatio(activity.canvasData.background) + chromeHeight(activity, detail)
}

export function ActivityArtifact({ activity, detail, palette, width }: ActivityArtifactProps) {
  const isFull = detail === 'full'
  const aspectRatio = getPitchAspectRatio(activity.canvasData.background)
  // 'simple' is the diagram and nothing else — full bleed, no padding, no title, no footer.
  const diagramWidth = isFull ? width - artifactLayout.padding * 2 : width

  const metaItems = [
    activity.durationMinutes ? `${activity.durationMinutes} min` : null,
    activity.playerCount ? `${activity.playerCount} players` : null,
  ].filter((item): item is string => item !== null)

  // Drawn at the editor's reference width and scaled, so markers, equipment, line weights and
  // labels keep exactly the proportions they have on screen at any output size.
  const diagram = (
    <ScaledDiagram width={diagramWidth} aspectRatio={aspectRatio}>
      {(size) => <CanvasDiagram canvasData={activity.canvasData} width={size.width} height={size.height} />}
    </ScaledDiagram>
  )

  if (!isFull) return <View style={{ width, backgroundColor: palette.background }}>{diagram}</View>

  return (
    <View style={[styles.container, { width, backgroundColor: palette.background, padding: artifactLayout.padding }]}>
      {activity.name.trim() ? (
        <Text style={[styles.title, { color: palette.textPrimary }]} numberOfLines={2}>
          {activity.name}
        </Text>
      ) : null}

      <View style={[styles.diagram, { borderColor: palette.textPrimary }]}>{diagram}</View>

      <View style={styles.details}>
        <MetaRow chip={activity.tag ? activityTagLabel(activity.tag) : undefined} items={metaItems} palette={palette} />
        <NotesBlock label="Notes" body={activity.notes ?? ''} palette={palette} />
        <NotesBlock label="Player actions" body={activity.playerActions ?? ''} palette={palette} />
      </View>

      <ArtifactFooter palette={palette} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  title: {
    ...artifactType.title,
    marginBottom: spacing.md,
  },
  diagram: {
    overflow: 'hidden',
    borderWidth: artifactLayout.diagramBorderWidth,
  },
  details: {
    alignSelf: 'stretch',
    marginTop: artifactLayout.blockGap,
  },
})
