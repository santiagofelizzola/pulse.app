import { useEffect } from 'react'
import { StyleSheet, Text } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'

import { canvas, colors, fonts, layout, spacing, typography } from '../../../theme/theme'
import type { LineupPosition, MarkerStyle } from '../../../types'
import { getMarkerVisualSize, MarkerVisual } from './MarkerVisual'

interface LineupMarkerProps {
  position: LineupPosition
  canvasSize: { width: number; height: number }
  // Text for inside the shape, resolved by the screen via getMarkerText from the lineup's
  // labelDisplay — empty in 'blank' mode. The name caption below is unaffected by that choice.
  text?: string
  markerStyle: MarkerStyle
  // Resolved by the screen from teamColor/keeperColor + position.isKeeper — undefined renders
  // the original default white marker.
  color?: string
  // Name-caption color, supplied by the lineup's pitch style — a dark caption is unreadable on a
  // dark pitch surface. Defaults to the original dark text for the white pitch.
  captionColor?: string
  // Halo behind that caption, also from the pitch style — opposite tone to captionColor.
  captionGlowColor?: string
  // Both omitted renders a STATIC marker with no gesture recognizers attached — the export
  // path, which needs the marker to look identical but must never be draggable.
  onMove?: (id: string, x: number, y: number) => void
  onPress?: (id: string) => void
}

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
export function LineupMarker({
  position,
  canvasSize,
  text,
  markerStyle,
  color,
  captionColor,
  captionGlowColor,
  onMove,
  onPress,
}: LineupMarkerProps) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const baseX = position.x * canvasSize.width
  const baseY = position.y * canvasSize.height

  const interactive = onMove !== undefined && onPress !== undefined

  const tap = Gesture.Tap()
    .maxDistance(TAP_MAX_DISTANCE)
    .hitSlop(layout.hitSlop)
    .onEnd(() => {
      if (onPress) runOnJS(onPress)(position.id)
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
        if (onMove) runOnJS(onMove)(position.id, nextX, nextY)
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

  // Half the SHAPE's height, not a fixed 30px — the jersey is taller than the circle, and using
  // a constant here would hang it below its stored position by the difference.
  const visualHeight = getMarkerVisualSize(markerStyle).height

  const style = useAnimatedStyle(() => ({
    left: baseX - CONTAINER_WIDTH / 2,
    top: baseY - visualHeight / 2,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }))

  const marker = (
    <Animated.View style={[styles.container, style]}>
      <MarkerVisual markerStyle={markerStyle} color={color} text={text} />
      <Text
        style={[
          styles.label,
          {
            color: captionColor ?? colors.textPrimary,
            textShadowColor: captionGlowColor ?? canvas.pitch.glowLight,
          },
        ]}
        numberOfLines={1}
      >
        {position.label}
      </Text>
    </Animated.View>
  )

  // The static case returns the very same view, minus the recognizers — so an exported marker
  // cannot drift from the one the coach positioned.
  return interactive ? <GestureDetector gesture={gesture}>{marker}</GestureDetector> : marker
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: CONTAINER_WIDTH,
    alignItems: 'center',
  },
  label: {
    ...typography.caption,
    fontFamily: fonts.semibold,
    // Zero offset + a soft blur = a halo around the glyphs rather than a directional drop shadow.
    // Only the color varies per pitch style (set inline above).
    textShadowOffset: canvas.marker.captionGlow.offset,
    textShadowRadius: canvas.marker.captionGlow.radius,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
})
