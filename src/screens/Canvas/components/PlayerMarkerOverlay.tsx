import { StyleSheet, Text } from 'react-native'
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'

import { canvas, colors, fonts, radius, typography } from '../../../theme/theme'
import { getMarkerTextColor } from '../../../utils/canvasUtils'
import type { PlayerMarker } from '../../../types'
import type { CommittedSnapshot, InteractionState } from '../hooks/useCanvasGestures'

interface PlayerMarkerOverlayProps {
  object: PlayerMarker
  canvasSize: { width: number; height: number }
  interaction: SharedValue<InteractionState>
  committed: SharedValue<CommittedSnapshot>
}

const DIAMETER = canvas.marker.diameter

export function PlayerMarkerOverlay({ object, canvasSize, interaction, committed }: PlayerMarkerOverlayProps) {
  const style = useAnimatedStyle(() => {
    // Markers never showed the reconciler race — they render in the app's own React tree, where
    // this effect is ordered child-before-parent within a single commit — but they read the
    // same snapshot as CanvasObject/ArrowPath so all three position paths stay identical and
    // none can drift apart later. See CommittedSnapshot in useCanvasGestures.ts.
    const c = committed.value.objects[object.id]
    const baseX = (c ? c.x : object.x) * canvasSize.width
    const baseY = (c ? c.y : object.y) * canvasSize.height
    const baseRotation = c ? c.rotation : object.rotation
    const baseScale = c ? c.scale : object.scale

    const live = interaction.value
    const isTarget = live.targetId === object.id

    const x = isTarget && live.mode === 'move' ? live.startX + live.dx : baseX
    const y = isTarget && live.mode === 'move' ? live.startY + live.dy : baseY
    const rotation = isTarget && live.mode === 'rotate' ? live.rotation : baseRotation
    const scale = isTarget && live.mode === 'scale' ? live.scale : baseScale

    return {
      left: x - DIAMETER / 2,
      top: y - DIAMETER / 2,
      transform: [{ rotate: `${rotation}rad` }, { scale }],
    }
  })

  return (
    <Animated.View style={[styles.marker, { backgroundColor: object.color ?? colors.surface }, style]}>
      <Text style={[styles.label, { color: getMarkerTextColor(object.color) }]}>{object.label}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    width: DIAMETER,
    height: DIAMETER,
    borderRadius: radius.pill,
    borderWidth: canvas.marker.border,
    borderColor: colors.canvasInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.label,
    fontFamily: fonts.semibold,
  },
})
