import type { RenderSpec } from './exportHost'
import { ActivityArtifact, measureActivityArtifact } from './templates/ActivityArtifact'
import { LineupArtifact, measureLineupArtifact } from './templates/LineupArtifact'
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
