import { StyleSheet, Text } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'

import { canvas, colors, fonts, layout, radius, spacing, typography } from '../../../theme/theme'
import type { LineupPosition } from '../../../types'

interface LineupMarkerProps {
  position: LineupPosition
  canvasSize: { width: number; height: number }
  showRole: boolean
  onMove: (id: string, x: number, y: number) => void
  onPress: (id: string) => void
}

const DIAMETER = canvas.marker.diameter
const CONTAINER_WIDTH = 72
// Boundary between "tap" and "drag" — a real drag travels well past this; a tap's natural finger
// jitter shouldn't. Shared by the Tap gesture's maxDistance and the Pan gesture's minDistance so
// the two partition cleanly with no dead zone between them.
const TAP_MAX_DISTANCE = 10

function clamp01(value: number): number {
  'worklet'
  return Math.min(1, Math.max(0, value))
}

// Own minimal drag/tap gesture — deliberately not the canvas's useCanvasGestures/InteractionState
// engine, which exists for move/rotate/scale/arrows/equipment this screen never needs (see
// architecture.md's "Lineup gesture handling" decision). Tap and Pan are purpose-built
// recognizers raced against each other, rather than inferring "was this a tap?" from a single
// Pan's travel distance in onEnd — the latter is fragile because a Pan's onEnd/onUpdate aren't
// reliably called at all for a near-zero-movement touch (see useCanvasGestures.ts's onEnd
// comment for the same failure mode on the drawing canvas).
export function LineupMarker({ position, canvasSize, showRole, onMove, onPress }: LineupMarkerProps) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const baseX = position.x * canvasSize.width
  const baseY = position.y * canvasSize.height

  const tap = Gesture.Tap()
    .maxDistance(TAP_MAX_DISTANCE)
    .hitSlop(layout.hitSlop)
    .onEnd(() => {
      runOnJS(onPress)(position.id)
    })

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(TAP_MAX_DISTANCE)
    .hitSlop(layout.hitSlop)
    .onUpdate((event) => {
      translateX.value = event.translationX
      translateY.value = event.translationY
    })
    .onEnd((event) => {
      if (canvasSize.width > 0 && canvasSize.height > 0) {
        const nextX = clamp01((baseX + event.translationX) / canvasSize.width)
        const nextY = clamp01((baseY + event.translationY) / canvasSize.height)
        runOnJS(onMove)(position.id, nextX, nextY)
      }
    })
    .onFinalize(() => {
      translateX.value = 0
      translateY.value = 0
    })

  const gesture = Gesture.Race(tap, pan)

  const style = useAnimatedStyle(() => ({
    left: baseX - CONTAINER_WIDTH / 2,
    top: baseY - DIAMETER / 2,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }))

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, style]}>
        <Animated.View style={styles.marker}>
          <Text style={styles.role} numberOfLines={1}>
            {showRole ? position.role ?? '' : ''}
          </Text>
        </Animated.View>
        <Text style={styles.label} numberOfLines={1}>
          {position.label}
        </Text>
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: CONTAINER_WIDTH,
    alignItems: 'center',
  },
  marker: {
    width: DIAMETER,
    height: DIAMETER,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: canvas.marker.border,
    borderColor: colors.canvasInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  role: {
    ...typography.label,
    fontFamily: fonts.semibold,
    color: colors.canvasInk,
  },
  label: {
    ...typography.caption,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
})
