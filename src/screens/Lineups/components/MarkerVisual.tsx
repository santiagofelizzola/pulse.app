import { StyleSheet, Text, View } from 'react-native'
import { SvgXml } from 'react-native-svg'

import { canvas, colors, fonts, radius, typography } from '../../../theme/theme'
import { applyJerseyColors, getMarkerTextColor, useJerseySvgText } from '../../../utils/canvasUtils'
import type { MarkerStyle } from '../../../types'

interface MarkerVisualProps {
  markerStyle: MarkerStyle
  // Resolved by the caller from teamColor/keeperColor + isKeeper — undefined renders the
  // original default white marker, same as LineupMarker's `color` prop.
  color?: string
  // Whatever goes inside the shape, already resolved by getMarkerText from the lineup's
  // labelDisplay — a role, a shirt number, or nothing. This component deliberately doesn't know
  // which of the three it's been handed; it just centers the string.
  text?: string
}

const DIAMETER = canvas.marker.diameter

// The asset's viewBox is cropped to its exact stroked ink (see assets/icons/jersey.svg), so
// these ARE the ink's true proportions — no hidden margin to correct for.
const JERSEY_VIEWBOX = { width: 310, height: 350 }

// The jersey renders deliberately LARGER than the circle rather than matching its 30px, and the
// marker text sets the floor on how small it can go (a two-letter role like "CM" is the widest
// case — a shirt number is narrower and never the binding constraint). Only the torso panel can carry that text, and
// the torso is exactly half the asset's full width (x 176-336 of 107-405 — sleeves take the
// other half), so a jersey scaled to the circle's 30px leaves a ~15px torso for text needing
// ~22px ("CM" at typography.label's 14px) and the label spills onto the sleeves. 1.875x puts the
// torso at ~29px, comfortably clear of that floor. Sized by width; height follows from the
// aspect, so the shape never distorts. This is the one knob to turn for overall jersey size —
// but the outline stroke in the asset is calibrated against it, so re-derive that too (the SVG
// comment carries the formula).
const JERSEY_SCALE = 1.875
const JERSEY_WIDTH = DIAMETER * JERSEY_SCALE

// Height is deliberately NOT the viewBox aspect: the source art is a long, narrow shirt that
// reads as a tank top at marker size, so it's squashed to 75% of its natural height. That makes
// the jersey wider than tall (1.18:1), which is how a real shirt reads with the sleeves out.
// This is what requires preserveAspectRatio="none" in the asset — without it the SVG would
// letterbox to fit and simply render smaller instead of squashing.
const JERSEY_VERTICAL_SQUASH = 0.75
const JERSEY_HEIGHT =
  ((JERSEY_WIDTH * JERSEY_VIEWBOX.height) / JERSEY_VIEWBOX.width) * JERSEY_VERTICAL_SQUASH

// A jersey's optical center is not its geometric one: the collar eats the top of the box, so
// text centered in the bounding box rides up onto the neck. Centering instead between the collar
// bottom (y=116) and the hem (y=410) puts the chest at (263-66)/350 = 0.563 of the ink box —
// 0.063 below the 0.5 the container would otherwise center on. Expressed as a ratio of the
// RENDERED height, so it survives the vertical squash above without needing to be re-derived.
// Applied to the marker text only; the shape itself stays centered so the marker's drag anchor is
// still its middle.
const JERSEY_LABEL_OFFSET = JERSEY_HEIGHT * 0.063

// Marker footprints differ by style, so LineupMarker has to ask rather than assume 30px — it
// anchors the marker on the stored position by offsetting half this height (see its
// useAnimatedStyle), and the name caption flows directly below it.
export function getMarkerVisualSize(markerStyle: MarkerStyle): { width: number; height: number } {
  return markerStyle === 'jersey'
    ? { width: JERSEY_WIDTH, height: JERSEY_HEIGHT }
    : { width: DIAMETER, height: DIAMETER }
}

// Pure shape rendering — circle or jersey, with the same centered text either way. Shared
// by the real on-pitch LineupMarker and the Appearance sheet's Marker style preview tiles, so a
// preview can never drift from what the pitch actually renders (same reasoning the pitch-style
// tiles already use PitchBackground directly instead of a redrawn approximation).
export function MarkerVisual({ markerStyle, color, text }: MarkerVisualProps) {
  const resolvedColor = color ?? colors.surface
  const isJersey = markerStyle === 'jersey'

  return (
    <View style={[styles.container, getMarkerVisualSize(markerStyle)]}>
      {isJersey ? (
        <JerseyShape color={resolvedColor} />
      ) : (
        <View style={[styles.circle, { backgroundColor: resolvedColor }]} />
      )}
      <Text
        style={[styles.text, isJersey && styles.textOnJersey, { color: getMarkerTextColor(resolvedColor) }]}
        numberOfLines={1}
      >
        {text ?? ''}
      </Text>
    </View>
  )
}

function JerseyShape({ color }: { color: string }) {
  const svgText = useJerseySvgText()
  if (!svgText) return null

  const xml = applyJerseyColors(svgText, {
    kit: color,
    // Fixed tone regardless of kit color, so a light jersey still reads against a light pitch —
    // the same role the circle's fixed borderColor plays below. The collar draws in this color
    // too (see the asset), so the silhouette reads as one outlined shape.
    outline: colors.canvasInk,
  })

  return <SvgXml xml={xml} width={JERSEY_WIDTH} height={JERSEY_HEIGHT} style={styles.jersey} />
}

const styles = StyleSheet.create({
  // Size comes from getMarkerVisualSize at render time — the two marker styles have different
  // footprints, so it can't be fixed here.
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    width: DIAMETER,
    height: DIAMETER,
    borderRadius: radius.pill,
    borderWidth: canvas.marker.border,
    borderColor: colors.canvasInk,
  },
  // Absolute so the marker text can sit on top of it rather than beside it; the container is sized
  // to the jersey exactly, so no insets are needed to place it.
  jersey: {
    position: 'absolute',
  },
  text: {
    ...typography.label,
    fontFamily: fonts.semibold,
  },
  // Drops the label from the box's center onto the shirt's chest — see JERSEY_LABEL_OFFSET.
  textOnJersey: {
    transform: [{ translateY: JERSEY_LABEL_OFFSET }],
  },
})
