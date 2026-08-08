import { StyleSheet, Text } from 'react-native'
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'

import { canvas, colors, fonts, radius, typography } from '../../../theme/theme'
import type { PlayerMarker } from '../../../types'
import type { DragState } from '../hooks/useCanvasGestures'

interface PlayerMarkerOverlayProps {
  object: PlayerMarker
  canvasSize: { width: number; height: number }
  dragState: SharedValue<DragState>
}

const DIAMETER = canvas.marker.diameter

export function PlayerMarkerOverlay({ object, canvasSize, dragState }: PlayerMarkerOverlayProps) {
  const style = useAnimatedStyle(() => {
    const baseX = object.x * canvasSize.width
    const baseY = object.y * canvasSize.height
    const isDragging = dragState.value.id === object.id
    const x = isDragging ? baseX + dragState.value.dx : baseX
    const y = isDragging ? baseY + dragState.value.dy : baseY
    return {
      left: x - DIAMETER / 2,
      top: y - DIAMETER / 2,
    }
  })

  return (
    <Animated.View style={[styles.marker, style]}>
      <Text style={styles.label}>{object.label}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    width: DIAMETER,
    height: DIAMETER,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: canvas.marker.border,
    borderColor: colors.canvasInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.label,
    fontFamily: fonts.semibold,
    color: colors.canvasInk,
  },
})
