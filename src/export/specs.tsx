import type { Activity } from '../types'
import type { RenderSpec } from './exportHost'
import { ActivityArtifact, measureActivityArtifact } from './templates/ActivityArtifact'
import type { ExportDetail, ExportPalette } from './types'

// Where subjects turn into render specs. This exists so utils/exportUtils.ts — the module
// architecture.md names as the export entry point — can stay a plain .ts file with no JSX in it,
// while the templates stay ordinary React components.

export function activitySpec(activity: Activity, detail: ExportDetail, palette: ExportPalette): RenderSpec {
  return {
    measure: (width) => measureActivityArtifact(activity, detail, width),
    render: (width) => <ActivityArtifact activity={activity} detail={detail} palette={palette} width={width} />,
    // PNG rather than JPEG deliberately: a pitch diagram is flat colour with thin dark lines,
    // which is JPEG's worst case (ringing along every marking) and PNG's best.
    format: 'png',
  }
}
