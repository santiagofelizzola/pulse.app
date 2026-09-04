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
// these ARE the ink's true proportions — no hidden margin to correct for. It tracks the asset's
// stroke width, which is calibrated against JERSEY_WIDTH, so both move together.
const JERSEY_VIEWBOX = { width: 312, height: 352 }

// The jersey's size is now its own token, with no arithmetic relationship to either marker
// diameter — it used to be `DIAMETER * 1.875`, which made a jersey change impossible without
// touching the circle marker it merely sits beside.
//
// What sets the floor is the marker text, not the circle. Only the torso panel can carry that
// text, and the torso is 160 of the asset's 312 viewBox units (x 176-336; the sleeves take the
// rest), so the rendered torso is 0.513 x JERSEY_WIDTH, seam centre to seam centre. The widest
// role this app generates is "CM" — 23.34pt at typography.label's 14px Poppins SemiBold,
// measured from the shipped .ttf; GK is 20.03 and a two-digit shirt number never exceeds 18.1.
// At 49.5 the torso is 25.4pt, so "CM" clears the seams by 2.0pt and clears the *inside* of the
// 2pt seam strokes by 0.05pt. Below roughly 49.4 the letters start crossing the seam.
//
// Sized by width; height follows from the aspect, so the shape never distorts.
const JERSEY_WIDTH = canvas.marker.jerseyWidth

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
// bottom (y=116) and the hem (y=410) puts the chest at (263-65)/352 = 0.5625 of the ink box —
// 0.0625 below the 0.5 the container would otherwise center on. Expressed as a ratio of the
// RENDERED height, so it survives the vertical squash above without needing to be re-derived.
// Applied to the marker text only; the shape itself stays centered so the marker's drag anchor is
// still its middle.
const JERSEY_LABEL_OFFSET = JERSEY_HEIGHT * 0.0625

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
