import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import Svg, { Text as SvgText } from 'react-native-svg'

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
  // Outline stroked around that caption's letterforms, also from the pitch style — opposite tone
  // to captionColor.
  captionOutlineColor?: string
  // Both omitted renders a STATIC marker with no gesture recognizers attached — the export
  // path, which needs the marker to look identical but must never be draggable.
  onMove?: (id: string, x: number, y: number) => void
  onPress?: (id: string) => void
}

const CONTAINER_WIDTH = 72

// The caption gets its OWN width, wider than the container it sits in. SVG text does not
// ellipsize — it clips at the viewport edge with no "…" — so the box has to hold a real first
// name rather than the 72pt the marker shape occupies (~14 characters at the caption's 13px
// SemiBold). The container is deliberately not widened to match: its width IS the marker's touch
// target, and stretching that would overlap the hit areas of neighbouring players in a back four.
// Both platforms leave the overflow visible (Android's ReactViewGroup sets clipChildren = false),
// and neither delivers touches to a child outside its parent's bounds, so the wider caption draws
// in full without becoming tappable.
const CAPTION_WIDTH = 110

const CAPTION_FONT_SIZE = typography.caption.fontSize
const CAPTION_LINE_HEIGHT = typography.caption.lineHeight

// Poppins' own vertical metrics as em fractions, read from the .ttf's hhea table (ascender 1050,
// descender -350, lineGap 100, against a 1000-unit em). An SVG <Text> is placed by its BASELINE,
// whereas the RN <Text> this replaced was placed by its line box, so the conversion has to be
// done here — half-leading plus ascent is the same placement RN derives for a Text with an
// explicit lineHeight, which is what keeps the caption on the pixels it has always sat on.
const FONT_ASCENT_EM = 1.05
const FONT_LINE_EM = 1.5
const CAPTION_BASELINE =
  (CAPTION_LINE_HEIGHT - FONT_LINE_EM * CAPTION_FONT_SIZE) / 2 + FONT_ASCENT_EM * CAPTION_FONT_SIZE

// The SVG viewport is a hard clip, so the box is padded by the full stroke width on every side —
// without it the outline on a descender (the y in "Ryan") is sliced off at the bottom edge. The
// same amount comes back off marginTop below, so nothing moves.
const CAPTION_OUTLINE_WIDTH = canvas.marker.captionOutline.width
const CAPTION_PADDING = CAPTION_OUTLINE_WIDTH
const CAPTION_HEIGHT = CAPTION_LINE_HEIGHT + CAPTION_PADDING * 2

// Shared by the outline and fill copies below so the two can never drift a subpixel apart.
const CAPTION_TEXT_PROPS = {
  x: CAPTION_WIDTH / 2,
  y: CAPTION_PADDING + CAPTION_BASELINE,
  textAnchor: 'middle',
  fontFamily: fonts.semibold,
  fontSize: CAPTION_FONT_SIZE,
} as const

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
  captionOutlineColor,
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
      <Svg width={CAPTION_WIDTH} height={CAPTION_HEIGHT} style={styles.caption}>
        {/* Drawn twice on purpose. react-native-svg has no paint-order support, so a stroke on a
            single <Text> is centered on the glyph outline AND painted over the fill — it eats
            half the letter weight inward and thickens the shape into mush at 13px. The copy
            underneath is stroke-only at double the intended width; once the filled copy lands on
            top, only the outer half of that stroke survives, which is a true outline around the
            letterforms rather than a halo behind them. */}
        <SvgText
          {...CAPTION_TEXT_PROPS}
          fill="none"
          stroke={captionOutlineColor ?? canvas.pitch.outlineLight}
          strokeWidth={CAPTION_OUTLINE_WIDTH * 2}
          strokeLinejoin="round"
        >
          {position.label}
        </SvgText>
        <SvgText {...CAPTION_TEXT_PROPS} fill={captionColor ?? colors.textPrimary}>
          {position.label}
        </SvgText>
      </Svg>
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
  caption: {
    // The stroke padding baked into CAPTION_HEIGHT comes straight back off the top margin, so the
    // glyphs land exactly where the RN <Text> put them.
    marginTop: spacing.xxs - CAPTION_PADDING,
  },
})
