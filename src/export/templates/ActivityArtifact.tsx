import { StyleSheet, Text, View } from 'react-native'

import { getPitchAspectRatio } from '../../screens/Canvas/components/PitchBackground'
import { CanvasDiagram } from '../../screens/Canvas/components/CanvasDiagram'
import { spacing } from '../../theme/theme'
import { activityTagLabel } from '../../utils/activityTags'
import type { Activity } from '../../types'
import type { ExportDetail, ExportPalette } from '../types'
import { artifactLayout, artifactType } from './parts/artifactStyles'
import { ArtifactFooter } from './parts/ArtifactFooter'
import { MetaRow } from './parts/MetaRow'
import { NotesBlock } from './parts/NotesBlock'

interface ActivityArtifactProps {
  activity: Activity
  detail: ExportDetail
  palette: ExportPalette
  // The artifact's layout width in points, decided by the host from the screen box — see
  // measureActivityArtifact.
  width: number
}

// Vertical space the chrome needs, in points, so the host can pick a width that keeps the whole
// artifact within the screen (the capture requires it — see capture.ts). These are estimates of
// laid-out height, not measurements: overshooting costs a little whitespace at the bottom of the
// image, undershooting would clip, so each is rounded up.
const TITLE_BLOCK_HEIGHT = 52
const FOOTER_HEIGHT = 44
const META_ROW_HEIGHT = 38
const NOTES_LINE_HEIGHT = 22
const NOTES_LABEL_HEIGHT = 24
// A pessimistic characters-per-line at artifact width, used only for the height estimate above.
const NOTES_CHARS_PER_LINE = 46

function estimateNotesHeight(body: string | undefined): number {
  if (!body?.trim()) return 0
  const lines = Math.ceil(body.trim().length / NOTES_CHARS_PER_LINE)
  return NOTES_LABEL_HEIGHT + lines * NOTES_LINE_HEIGHT + spacing.lg
}

/**
 * The artifact's aspect ratio (height / width) at a given width, and therefore the sizing rule
 * for the whole export.
 *
 * The diagram's own aspect varies a lot by background — getPitchAspectRatio returns 0.648 for a
 * full pitch (very tall), 0.971 for a half pitch and 1.263 for a third (landscape) — so the
 * artifact deliberately follows the diagram rather than forcing every drill into one frame,
 * which would either letterbox a third or crop a full pitch.
 */
export function measureActivityArtifact(activity: Activity, detail: ExportDetail, width: number): number {
  const contentWidth = width - artifactLayout.padding * 2
  const diagramHeight = contentWidth / getPitchAspectRatio(activity.canvasData.background)

  let height = artifactLayout.padding * 2 + TITLE_BLOCK_HEIGHT + diagramHeight + artifactLayout.blockGap + FOOTER_HEIGHT

  if (detail === 'full') {
    const hasMeta = Boolean(activity.tag || activity.durationMinutes || activity.playerCount)
    if (hasMeta) height += META_ROW_HEIGHT
    height += estimateNotesHeight(activity.notes)
    height += estimateNotesHeight(activity.playerActions)
  }

  return height
}

export function ActivityArtifact({ activity, detail, palette, width }: ActivityArtifactProps) {
  const contentWidth = width - artifactLayout.padding * 2
  const diagramHeight = contentWidth / getPitchAspectRatio(activity.canvasData.background)

  const metaItems = [
    activity.durationMinutes ? `${activity.durationMinutes} min` : null,
    activity.playerCount ? `${activity.playerCount} players` : null,
  ].filter((item): item is string => item !== null)

  return (
    <View style={[styles.container, { width, backgroundColor: palette.background, padding: artifactLayout.padding }]}>
      <Text style={[styles.title, { color: palette.textPrimary }]} numberOfLines={2}>
        {activity.name}
      </Text>

      <View
        style={[
          styles.diagram,
          {
            width: contentWidth,
            height: diagramHeight,
            borderColor: palette.textPrimary,
            borderWidth: artifactLayout.diagramBorderWidth,
          },
        ]}
      >
        <CanvasDiagram canvasData={activity.canvasData} width={contentWidth} height={diagramHeight} />
      </View>

      {detail === 'full' ? (
        <View style={styles.details}>
          <MetaRow
            chip={activity.tag ? activityTagLabel(activity.tag) : undefined}
            items={metaItems}
            palette={palette}
          />
          <NotesBlock label="Notes" body={activity.notes ?? ''} palette={palette} />
          <NotesBlock label="Player actions" body={activity.playerActions ?? ''} palette={palette} />
        </View>
      ) : null}

      <ArtifactFooter palette={palette} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    // Height is left to content, and the host measures whatever it comes out as. The host sizes
    // the WIDTH so that height fits the screen, which is what keeps the capture inside
    // drawViewHierarchyInRect's safe envelope.
    alignItems: 'flex-start',
  },
  title: {
    ...artifactType.title,
    marginBottom: spacing.md,
  },
  diagram: {
    position: 'relative',
    overflow: 'hidden',
  },
  details: {
    alignSelf: 'stretch',
    marginTop: artifactLayout.blockGap,
  },
})
