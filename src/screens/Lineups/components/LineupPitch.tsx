import { StyleSheet, View } from 'react-native'
import { Canvas } from '@shopify/react-native-skia'

import { PitchBackground } from '../../Canvas/components/PitchBackground'
import { isKeeperPosition } from '../../../utils/formationSlots'
import { getMarkerText } from '../../../utils/labelDisplay'
import { DEFAULT_MARKER_STYLE } from '../../../utils/markerStyles'
import { getPitchStyleValue } from '../../../utils/pitchStyles'
import type { LabelDisplay, LineupPosition, MarkerStyle, PitchStyle } from '../../../types'
import { LineupMarker } from './LineupMarker'

// Exactly the fields that decide what a lineup LOOKS like — not a persisted Lineup. A lineup
// being edited has all of these in component state and no id yet, so taking the record would
// have forced the export path to invent one.
export interface LineupAppearance {
  positions: LineupPosition[]
  labelDisplay?: LabelDisplay
  markerStyle?: MarkerStyle
  pitchStyle?: PitchStyle
  teamColor?: string
  keeperColor?: string
}

interface LineupPitchProps extends LineupAppearance {
  width: number
  height: number
  // Both omitted renders a static pitch — see LineupMarker.
  onMove?: (id: string, x: number, y: number) => void
  onPress?: (id: string) => void
}

// The pitch and the players on it, with no chrome and no editor state. Shared by
// LineupEditorScreen and the export's LineupArtifact for the same reason CanvasDiagram is shared
// by CanvasScreen and ActivityArtifact: an export that draws its own version of the pitch is an
// export that silently stops matching the app.
export function LineupPitch({
  positions,
  labelDisplay,
  markerStyle,
  pitchStyle,
  teamColor,
  keeperColor,
  width,
  height,
  onMove,
  onPress,
}: LineupPitchProps) {
  const style = getPitchStyleValue(pitchStyle)
  const resolvedMarkerStyle = markerStyle ?? DEFAULT_MARKER_STYLE
  const resolvedLabelDisplay = labelDisplay ?? 'blank'

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill}>
        <PitchBackground background="full-pitch" width={width} height={height} style={style} />
      </Canvas>
      <View style={StyleSheet.absoluteFill}>
        {positions.map((position) => (
          <LineupMarker
            key={position.id}
            position={position}
            canvasSize={{ width, height }}
            text={getMarkerText(position, resolvedLabelDisplay)}
            markerStyle={resolvedMarkerStyle}
            color={isKeeperPosition(position) ? keeperColor : teamColor}
            captionColor={style.captionColor}
            captionGlowColor={style.captionGlowColor}
            onMove={onMove}
            onPress={onPress}
          />
        ))}
      </View>
    </>
  )
}
