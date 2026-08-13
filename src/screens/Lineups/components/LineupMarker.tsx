import { useEffect } from 'react'
import { StyleSheet, Text } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'

import { canvas, colors, fonts, layout, radius, spacing, typography } from '../../../theme/theme'
import { getMarkerTextColor } from '../../../utils/canvasUtils'
import type { LineupPosition } from '../../../types'

interface LineupMarkerProps {
  position: LineupPosition
  canvasSize: { width: number; height: number }
  showRole: boolean
  // Resolved by the screen from teamColor/keeperColor + position.isKeeper — undefined renders
  // the original default white marker.
  color?: string
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
export function LineupMarker({ position, canvasSize, showRole, color, onMove, onPress }: LineupMarkerProps) {
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
        // Deliberately NOT resetting translateX/Y here: onMove's setPositions() update reaches
        // this component's `position` prop asynchronously, one render behind. Zeroing the
        // translate now would make the marker render at its stale pre-drag baseX/baseY for that
        // one frame — a snap-back-then-jump flicker. Left at its live drag offset, the marker
        // stays visually put at the same on-screen spot until the effect below hands off to the
        // committed position once baseX/baseY actually catch up.
        runOnJS(onMove)(position.id, nextX, nextY)
      }
    })
    .onFinalize((_event, success) => {
      // A committed drag (success) is handled by the effect below instead — only an
      // uncommitted/cancelled gesture needs an immediate reset here, since nothing is coming to
      // hand off to.
      if (!success) {
        translateX.value = 0
        translateY.value = 0
      }
    })

  const gesture = Gesture.Race(tap, pan)

  // Fires once `position.x/y` (and therefore baseX/baseY above) actually reflect a just-committed
  // drag, so the live offset can be cleared with no frame in between showing the old position.
  useEffect(() => {
    translateX.value = 0
    translateY.value = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.x, position.y])

  const style = useAnimatedStyle(() => ({
    left: baseX - CONTAINER_WIDTH / 2,
    top: baseY - DIAMETER / 2,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }))

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, style]}>
        <Animated.View style={[styles.marker, { backgroundColor: color ?? colors.surface }]}>
          <Text style={[styles.role, { color: getMarkerTextColor(color) }]} numberOfLines={1}>
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
    borderWidth: canvas.marker.border,
    borderColor: colors.canvasInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  role: {
    ...typography.label,
    fontFamily: fonts.semibold,
  },
  label: {
    ...typography.caption,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
})
