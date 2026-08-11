import { StyleSheet, Text } from 'react-native'
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'

import { canvas, colors, fonts, radius, typography } from '../../../theme/theme'
import type { PlayerMarker } from '../../../types'
import type { InteractionState } from '../hooks/useCanvasGestures'

interface PlayerMarkerOverlayProps {
  object: PlayerMarker
  canvasSize: { width: number; height: number }
  interaction: SharedValue<InteractionState>
}

const DIAMETER = canvas.marker.diameter

export function PlayerMarkerOverlay({ object, canvasSize, interaction }: PlayerMarkerOverlayProps) {
  const style = useAnimatedStyle(() => {
    const baseX = object.x * canvasSize.width
    const baseY = object.y * canvasSize.height
    const live = interaction.value
    const isTarget = live.targetId === object.id

    const x = isTarget && live.mode === 'move' ? baseX + live.dx : baseX
    const y = isTarget && live.mode === 'move' ? baseY + live.dy : baseY
    const rotation = isTarget && live.mode === 'rotate' ? live.rotation : object.rotation
    const scale = isTarget && live.mode === 'scale' ? live.scale : object.scale

    return {
      left: x - DIAMETER / 2,
      top: y - DIAMETER / 2,
      transform: [{ rotate: `${rotation}rad` }, { scale }],
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
