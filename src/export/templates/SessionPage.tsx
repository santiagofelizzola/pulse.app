import { StyleSheet, Text, View } from 'react-native'

import { fonts, radius, spacing } from '../../theme/theme'
import { CanvasDiagram } from '../../screens/Canvas/components/CanvasDiagram'
import { getPitchAspectRatio } from '../../screens/Canvas/components/PitchBackground'
import { blockTypeColor, blockTypeLabel } from '../../utils/blockTypes'
import { coachingPointLines, fitCoachingPoints } from '../../utils/coachingPoints'
import type { Session, SessionActivity } from '../../types'
import { SESSION_PAGE } from '../pdf'
import {
  overviewCardHeight,
  OVERVIEW_CARD_GAP,
  SESSION_PAGE_FOOTER_HEIGHT,
  SESSION_PAGE_PADDING,
  type SessionPage as SessionPageSpec,
} from '../sessionPages'
import type { ExportPalette } from '../types'
import { artifactLayout, artifactType } from './parts/artifactStyles'
import { ScaledDiagram } from './parts/ScaledDiagram'

interface SessionPageProps {
  page: SessionPageSpec
  session: Session
  palette: ExportPalette
  pageNumber: number
  pageCount: number
}

const PAGE_PADDING = SESSION_PAGE_PADDING
const PAGE_FOOTER_HEIGHT = SESSION_PAGE_FOOTER_HEIGHT
const CONTENT_WIDTH = SESSION_PAGE.width - PAGE_PADDING * 2

// Cards divide the page body evenly (see overviewCardHeight), so an overview always fills its
// page whether it carries three activities or eight, and a short last page has taller cards
// rather than a hole.
const OVERVIEW_DIAGRAM_MAX_WIDTH = 130
// Below this a card can only hold one line of name plus its meta row.
const OVERVIEW_COMPACT_HEIGHT = 90

// A detail page's diagram gets the full content width unless the text around it needs the room,
// in which case height governs and the diagram narrows and centres.
//
// Every term below is a REAL laid-out height, because nothing on this page shrinks — React
// Native's flexShrink defaults to 0, so an underestimate does not compress the layout, it pushes
// the last line of coaching points straight through the footer rule. The previous version missed
// the diagram's 2pt border (2pt over) and assumed a single-line title (34pt over on any activity
// name longer than about eighteen characters).
const DETAIL_HEADER_HEIGHT = 26 // block tag (22) + its margin (4)
const DETAIL_TITLE_LINE_HEIGHT = 32 // typography.h1
const DETAIL_TITLE_MARGIN = 12
const DETAIL_TITLE_CHARS_PER_LINE = 18 // h1 at 24pt across the content width
const DETAIL_TITLE_MAX_LINES = 2 // matches numberOfLines on the title
const DETAIL_SECTION_MARGIN = 16
const DETAIL_LABEL_HEIGHT = 24
const DETAIL_BODY_LINE_HEIGHT = 22
const DETAIL_COACHING_MAX_LINES = 8
// Narrower than the plain content width because each point is indented behind its bullet.
const DETAIL_CHARS_PER_LINE = 42
const DETAIL_BULLET_GAP = spacing.sm
const DETAIL_DIAGRAM_MIN_WIDTH = 120
// Slack for rounding and for text that wraps a line earlier than the character estimate expects.
// Cheap insurance: it costs a few points of diagram, and buys never overlapping the footer.
const DETAIL_SAFETY = 12

function estimateLines(text: string, charsPerLine: number, maxLines: number): number {
  return Math.min(maxLines, Math.max(1, Math.ceil(text.length / charsPerLine)))
}

function detailDiagramWidth(block: SessionActivity): number {
  const titleLines = estimateLines(block.activity.name, DETAIL_TITLE_CHARS_PER_LINE, DETAIL_TITLE_MAX_LINES)
  const titleHeight = titleLines * DETAIL_TITLE_LINE_HEIGHT + DETAIL_TITLE_MARGIN

  // Counted from the real POINTS, not the raw string's length. Coaching points are one per line,
  // so "Score\nPlay quick\nPress high" is 27 characters but three rendered lines — the previous
  // character-only estimate called that one line and overflowed the page by 44pt.
  const points = coachingPointLines(block.coachingPoints)
  const textHeight = points.length
    ? DETAIL_SECTION_MARGIN +
      DETAIL_LABEL_HEIGHT +
      fitCoachingPoints(points, DETAIL_CHARS_PER_LINE, DETAIL_COACHING_MAX_LINES).lines * DETAIL_BODY_LINE_HEIGHT
    : 0

  const budget =
    SESSION_PAGE.height -
    PAGE_PADDING * 2 -
    PAGE_FOOTER_HEIGHT -
    DETAIL_HEADER_HEIGHT -
    titleHeight -
    textHeight -
    artifactLayout.diagramBorderWidth * 2 -
    DETAIL_SAFETY

  const aspectRatio = getPitchAspectRatio(block.activity.canvasData.background)
  return Math.max(DETAIL_DIAGRAM_MIN_WIDTH, Math.min(CONTENT_WIDTH, budget * aspectRatio))
}

function blockDuration(block: SessionActivity): number | undefined {
  return block.durationOverride ?? block.activity.durationMinutes
}

function durationLabel(block: SessionActivity): string | null {
  const minutes = blockDuration(block)
  return minutes ? `${minutes} min` : null
}

// A tinted block-type tag. design.md warns that Pressing/Defending and Technical/Attacking/Game
// are close colour clusters, so the label always rides along with the colour.
function BlockTag({ block, palette }: { block: SessionActivity; palette: ExportPalette }) {
  const color = blockTypeColor(block.blockType)
  return (
    <View style={[styles.blockTag, { backgroundColor: palette.block[block.blockType].tint }]}>
      <Text style={[styles.blockTagLabel, { color }]}>{blockTypeLabel(block.blockType)}</Text>
    </View>
  )
}

function PageFrame({
  children,
  palette,
  footer,
}: {
  children: React.ReactNode
  palette: ExportPalette
  footer: string
}) {
  return (
    <View style={[styles.page, { backgroundColor: palette.background, padding: PAGE_PADDING }]}>
      <View style={styles.pageBody}>{children}</View>
      <View style={[styles.pageFooter, { borderTopColor: palette.borderSubtle }]}>
        <Text style={[styles.footerText, { color: palette.textSecondary }]} numberOfLines={1}>
          {footer}
        </Text>
      </View>
    </View>
  )
}

// Diagrams render LIVE here rather than as pre-captured images.
//
// ScaledDiagram already draws at the editor's reference width and scales the result, which is the
// only reason the two-stage capture existed — so the intermediate rasters bought nothing and cost
// three failure modes: a capture per activity, RN <Image> being handed view-shot's scheme-less
// temp path, and a race where a page could be captured before its images finished decoding.
export function SessionPage({ page, session, palette, pageNumber, pageCount }: SessionPageProps) {
  const footer = `${session.name || 'Session'} · ${pageNumber} of ${pageCount}`

  if (page.kind === 'cover') {
    return (
      <PageFrame palette={palette} footer={footer}>
        <Text style={[styles.coverTitle, { color: palette.textPrimary }]} numberOfLines={3}>
          {session.name || 'Untitled session'}
        </Text>
        <Text style={[styles.coverMeta, { color: palette.textSecondary }]}>
          {session.totalDurationMinutes} min · {session.activities.length}{' '}
          {session.activities.length === 1 ? 'block' : 'blocks'}
          {session.playerCount ? ` · ${session.playerCount} players` : ''}
        </Text>

        {session.focus?.trim() ? (
          <View style={styles.coverSection}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Focus</Text>
            <Text style={[styles.body, { color: palette.textPrimary }]}>{session.focus.trim()}</Text>
          </View>
        ) : null}

        <View style={styles.coverSection}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Running order</Text>
          {session.activities.map((block, index) => (
            <View key={block.id} style={styles.runningOrderRow}>
              <View style={[styles.runningOrderDot, { backgroundColor: blockTypeColor(block.blockType) }]} />
              <Text style={[styles.runningOrderName, { color: palette.textPrimary }]} numberOfLines={1}>
                {index + 1}. {block.activity.name}
              </Text>
              <Text style={[styles.runningOrderMeta, { color: palette.textSecondary }]}>
                {durationLabel(block) ?? ''}
              </Text>
            </View>
          ))}
        </View>

        {session.coachingMoments?.trim() ? (
          <View style={styles.coverSection}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Coaching moments</Text>
            <Text style={[styles.body, { color: palette.textPrimary }]} numberOfLines={6}>
              {session.coachingMoments.trim()}
            </Text>
          </View>
        ) : null}
      </PageFrame>
    )
  }

  if (page.kind === 'detail') {
    const { block } = page
    // Same fit the height budget used, so what is measured is exactly what is drawn.
    const { visible: coachingPoints } = fitCoachingPoints(
      coachingPointLines(block.coachingPoints),
      DETAIL_CHARS_PER_LINE,
      DETAIL_COACHING_MAX_LINES
    )

    return (
      <PageFrame palette={palette} footer={footer}>
        <View style={styles.detailHeader}>
          <BlockTag block={block} palette={palette} />
          {durationLabel(block) ? (
            <Text style={[styles.detailDuration, { color: palette.textSecondary }]}>{durationLabel(block)}</Text>
          ) : null}
        </View>
        <Text style={[styles.detailTitle, { color: palette.textPrimary }]} numberOfLines={2}>
          {block.activity.name}
        </Text>

        <View style={[styles.detailDiagram, { borderColor: palette.border }]}>
          <ScaledDiagram
            width={detailDiagramWidth(block)}
            aspectRatio={getPitchAspectRatio(block.activity.canvasData.background)}
          >
            {(size) => (
              <CanvasDiagram canvasData={block.activity.canvasData} width={size.width} height={size.height} />
            )}
          </ScaledDiagram>
        </View>

        {coachingPoints.length > 0 ? (
          <View style={styles.detailSection}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Coaching points</Text>
            {coachingPoints.map((point, index) => (
              <View key={`${index}-${point}`} style={styles.coachingRow}>
                <Text style={[styles.coachingBullet, { color: palette.textSecondary }]}>•</Text>
                <Text style={[styles.body, styles.coachingText, { color: palette.textPrimary }]}>{point}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </PageFrame>
    )
  }

  const cardHeight = overviewCardHeight(page.blocks.length)
  const compact = cardHeight < OVERVIEW_COMPACT_HEIGHT

  return (
    <PageFrame palette={palette} footer={footer}>
      {page.blocks.map((block) => {
        // The diagram is sized off the CARD, not a constant, so cards shrink gracefully as more
        // activities share the page. Width follows from the diagram's own aspect, so a tall full
        // pitch and a landscape final-third each fill their box instead of being letterboxed.
        const aspectRatio = getPitchAspectRatio(block.activity.canvasData.background)
        const diagramWidth = Math.min(
          OVERVIEW_DIAGRAM_MAX_WIDTH,
          (cardHeight - artifactLayout.diagramBorderWidth * 2) * aspectRatio
        )

        return (
          <View key={block.id} style={[styles.overviewCard, { height: cardHeight }]}>
            <View style={[styles.overviewBar, { backgroundColor: blockTypeColor(block.blockType) }]} />
            <View
              style={[
                styles.overviewDiagram,
                { width: diagramWidth, height: diagramWidth / aspectRatio, borderColor: palette.border },
              ]}
            >
              <ScaledDiagram width={diagramWidth} aspectRatio={aspectRatio}>
                {(size) => (
                  <CanvasDiagram canvasData={block.activity.canvasData} width={size.width} height={size.height} />
                )}
              </ScaledDiagram>
            </View>
            <View style={styles.overviewText}>
              <Text
                style={[styles.overviewTitle, { color: palette.textPrimary }]}
                numberOfLines={compact ? 1 : 2}
              >
                {block.activity.name}
              </Text>
              <View style={styles.overviewMetaRow}>
                <BlockTag block={block} palette={palette} />
                {durationLabel(block) ? (
                  <Text style={[styles.overviewMeta, { color: palette.textSecondary }]}>{durationLabel(block)}</Text>
                ) : null}
              </View>
            </View>
          </View>
        )
      })}
    </PageFrame>
  )
}

const styles = StyleSheet.create({
  page: {
    width: SESSION_PAGE.width,
    height: SESSION_PAGE.height,
  },
  pageBody: {
    flex: 1,
  },
  pageFooter: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  footerText: {
    ...artifactType.footer,
  },
  coverTitle: {
    ...artifactType.title,
    marginBottom: spacing.xs,
  },
  coverMeta: {
    ...artifactType.meta,
  },
  coverSection: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    ...artifactType.sectionLabel,
    fontFamily: fonts.semibold,
    marginBottom: spacing.xs,
  },
  body: {
    ...artifactType.body,
  },
  runningOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  runningOrderDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
  },
  runningOrderName: {
    ...artifactType.body,
    flex: 1,
  },
  runningOrderMeta: {
    ...artifactType.meta,
    marginLeft: spacing.sm,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  detailDuration: {
    ...artifactType.meta,
  },
  detailTitle: {
    ...artifactType.title,
    marginBottom: spacing.md,
  },
  detailDiagram: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: artifactLayout.diagramBorderWidth,
  },
  detailSection: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  coachingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  coachingBullet: {
    ...artifactType.body,
    marginRight: DETAIL_BULLET_GAP,
  },
  coachingText: {
    flex: 1,
  },
  overviewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: OVERVIEW_CARD_GAP,
  },
  overviewBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    marginRight: spacing.md,
  },
  overviewDiagram: {
    overflow: 'hidden',
    borderWidth: artifactLayout.diagramBorderWidth,
  },
  overviewText: {
    flex: 1,
    marginLeft: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  overviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  overviewTitle: {
    ...artifactType.body,
    fontFamily: fonts.semibold,
  },
  overviewMeta: {
    ...artifactType.meta,
  },
  blockTag: {
    height: 22,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  blockTagLabel: {
    ...artifactType.overline,
    fontFamily: fonts.semibold,
  },
})
