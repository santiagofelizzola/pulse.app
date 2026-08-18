import { StyleSheet, Text, View } from 'react-native'

import { getPitchAspectRatio } from '../../screens/Canvas/components/PitchBackground'
import { LineupPitch } from '../../screens/Lineups/components/LineupPitch'
import { fonts, spacing } from '../../theme/theme'
import type { LineupPosition } from '../../types'
import type { ExportDetail, ExportPalette, LineupArtifactInput } from '../types'
import { artifactLayout, artifactType } from './parts/artifactStyles'
import { ArtifactFooter } from './parts/ArtifactFooter'
import { MetaRow } from './parts/MetaRow'
import { ScaledDiagram } from './parts/ScaledDiagram'

interface LineupArtifactProps {
  lineup: LineupArtifactInput
  detail: ExportDetail
  palette: ExportPalette
  width: number
}

const TITLE_BLOCK_HEIGHT = 52
const META_ROW_HEIGHT = 38
const FOOTER_HEIGHT = 44
const SQUAD_LIST_ROW_HEIGHT = 24
const SECTION_LABEL_HEIGHT = 26
const SUBS_ROW_HEIGHT = 24
const SQUAD_LIST_COLUMNS = 2

const PITCH_ASPECT = getPitchAspectRatio('full-pitch')

function squadListRows(count: number): number {
  return Math.ceil(count / SQUAD_LIST_COLUMNS)
}

/**
 * Reorders for a row-major flex-wrap grid so the result READS down each column.
 *
 * Laid out in source order a squad fills left-to-right, making the left column 1st, 3rd, 5th —
 * which scans as a jumble.
 */
function toColumnMajor<T>(items: T[], columns: number): T[] {
  const rows = Math.ceil(items.length / columns)
  const out: T[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const item = items[column * rows + row]
      if (item !== undefined) out.push(item)
    }
  }
  return out
}

function positionLine(position: LineupPosition): string {
  const number = position.shirtNumber != null ? `${position.shirtNumber}. ` : ''
  const name = position.label.trim()
  // No name entered yet: the role is the only identifier worth printing. Rendering "— (GK)"
  // fills the list with dashes for a lineup the coach hasn't finished naming.
  if (!name) return `${number}${position.role || 'Player'}`
  return position.role ? `${number}${name} (${position.role})` : `${number}${name}`
}

// Everything other than the pitch. Zero for 'simple', which is nothing but the pitch.
function chromeHeight(lineup: LineupArtifactInput, detail: ExportDetail): number {
  if (detail !== 'full') return 0

  let height = artifactLayout.padding * 2 + artifactLayout.blockGap + META_ROW_HEIGHT + FOOTER_HEIGHT
  if (lineup.name.trim()) height += TITLE_BLOCK_HEIGHT
  if (lineup.positions.length > 0) {
    height += SECTION_LABEL_HEIGHT + squadListRows(lineup.positions.length) * SQUAD_LIST_ROW_HEIGHT + spacing.lg
  }
  if (lineup.subs && lineup.subs.length > 0) {
    height += SECTION_LABEL_HEIGHT + SUBS_ROW_HEIGHT + spacing.lg
  }
  return height
}

/**
 * The artifact's height at a given width.
 *
 * The pitch is ALWAYS the full artifact width at its true 68:105 proportions — the same shape and
 * the same shape only, as the editor draws it. Nothing is allowed to squeeze it: 'full' adds its
 * metadata below and the artifact simply gets taller.
 */
export function measureLineupArtifact(
  lineup: LineupArtifactInput,
  detail: ExportDetail,
  width: number
): number {
  const pitchWidth = detail === 'full' ? width - artifactLayout.padding * 2 : width
  return pitchWidth / PITCH_ASPECT + chromeHeight(lineup, detail)
}

export function LineupArtifact({ lineup, detail, palette, width }: LineupArtifactProps) {
  const isFull = detail === 'full'
  // 'simple' is the pitch and nothing else — full bleed, no padding, no title, no footer. What
  // the coach sees in the editor is exactly what lands in the file.
  const pitchWidth = isFull ? width - artifactLayout.padding * 2 : width

  const metaItems = [
    `${lineup.squadSize}v${lineup.squadSize}`,
    lineup.formation && lineup.formation !== 'custom' ? lineup.formation : null,
  ].filter((item): item is string => item !== null)

  const subs = lineup.subs ?? []

  // Drawn at the editor's reference width and scaled, so markers, captions and the pitch's own
  // margin keep exactly the proportions they have on screen at any output size.
  const pitch = (
    <ScaledDiagram width={pitchWidth} aspectRatio={PITCH_ASPECT}>
      {(size) => (
        <LineupPitch
          positions={lineup.positions}
          labelDisplay={lineup.labelDisplay}
          markerStyle={lineup.markerStyle}
          pitchStyle={lineup.pitchStyle}
          teamColor={lineup.teamColor}
          keeperColor={lineup.keeperColor}
          width={size.width}
          height={size.height}
        />
      )}
    </ScaledDiagram>
  )

  if (!isFull) return <View style={{ width, backgroundColor: palette.background }}>{pitch}</View>

  return (
    <View style={[styles.container, { width, backgroundColor: palette.background, padding: artifactLayout.padding }]}>
      {lineup.name.trim() ? (
        <Text style={[styles.title, { color: palette.textPrimary }]} numberOfLines={2}>
          {lineup.name}
        </Text>
      ) : null}

      <View style={[styles.pitch, { borderColor: palette.textPrimary }]}>{pitch}</View>

      <View style={styles.details}>
        <MetaRow items={metaItems} palette={palette} />

        {lineup.positions.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Starting {lineup.squadSize}</Text>
            <View style={styles.squadList}>
              {toColumnMajor(lineup.positions, SQUAD_LIST_COLUMNS).map((position) => (
                <Text key={position.id} style={[styles.squadItem, { color: palette.textPrimary }]} numberOfLines={1}>
                  {positionLine(position)}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {subs.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Subs</Text>
            <Text style={[styles.subs, { color: palette.textPrimary }]}>
              {subs.map((sub) => (sub.position ? `${sub.name} (${sub.position})` : sub.name)).join(' · ')}
            </Text>
          </View>
        ) : null}
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
  pitch: {
    overflow: 'hidden',
    borderWidth: artifactLayout.diagramBorderWidth,
  },
  details: {
    alignSelf: 'stretch',
    marginTop: artifactLayout.blockGap,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    ...artifactType.sectionLabel,
    fontFamily: fonts.semibold,
    marginBottom: spacing.xs,
  },
  squadList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  squadItem: {
    ...artifactType.body,
    width: `${100 / SQUAD_LIST_COLUMNS}%`,
    lineHeight: SQUAD_LIST_ROW_HEIGHT,
  },
  subs: {
    ...artifactType.body,
  },
})
