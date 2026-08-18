import type { Session } from '../types'
import type { RenderSpec } from './exportHost'
import { SESSION_PAGE } from './pdf'
import type { SessionPage as SessionPageSpec } from './sessionPages'
import { ActivityArtifact, measureActivityArtifact } from './templates/ActivityArtifact'
import { LineupArtifact, measureLineupArtifact } from './templates/LineupArtifact'
import { SessionPage } from './templates/SessionPage'
import type { ActivityArtifactInput, ExportDetail, ExportPalette, LineupArtifactInput } from './types'

// Where subjects turn into render specs. This exists so utils/exportUtils.ts — the module
// architecture.md names as the export entry point — can stay a plain .ts file with no JSX in it,
// while the templates stay ordinary React components.
//
// PNG rather than JPEG throughout: a pitch diagram is flat colour with thin dark lines, which is
// JPEG's worst case (ringing along every marking) and PNG's best.

export function activitySpec(
  activity: ActivityArtifactInput,
  detail: ExportDetail,
  palette: ExportPalette
): RenderSpec {
  return {
    measure: (width) => measureActivityArtifact(activity, detail, width),
    render: (width) => <ActivityArtifact activity={activity} detail={detail} palette={palette} width={width} />,
    format: 'png',
  }
}

export function lineupSpec(lineup: LineupArtifactInput, detail: ExportDetail, palette: ExportPalette): RenderSpec {
  return {
    measure: (width) => measureLineupArtifact(lineup, detail, width),
    render: (width) => <LineupArtifact lineup={lineup} detail={detail} palette={palette} width={width} />,
    format: 'png',
  }
}

/**
 * One page of a session PDF, rasterized.
 *
 * JPEG rather than PNG here, unlike the image artifacts: a page is mostly text and photographic
 * compression is far cheaper across several pages, while the diagrams it contains are already
 * scaled down enough that ringing along their lines is not visible.
 */
export function sessionPageSpec(
  page: SessionPageSpec,
  session: Session,
  palette: ExportPalette,
  pageNumber: number,
  pageCount: number
): RenderSpec {
  return {
    fixedWidth: SESSION_PAGE.width,
    measure: (width) => (width / SESSION_PAGE.width) * SESSION_PAGE.height,
    render: () => (
      <SessionPage
        page={page}
        session={session}
        palette={palette}
        pageNumber={pageNumber}
        pageCount={pageCount}
      />
    ),
    format: 'jpg',
    quality: 0.82,
    // Straight into the PDF's HTML — see buildPdfFromPageImages.
    encoding: 'data-uri',
  }
}
