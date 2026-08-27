import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { Canvas } from '@shopify/react-native-skia'
import { Check } from 'lucide-react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { SegmentedToggle } from '../../../components/ui/SegmentedToggle'
import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { PitchBackground } from '../../Canvas/components/PitchBackground'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import { getMarkerTextColor, LINEUP_MARKER_SWATCHES } from '../../../utils/canvasUtils'
import { LABEL_DISPLAY_OPTIONS } from '../../../utils/labelDisplay'
import { MARKER_STYLE_OPTIONS } from '../../../utils/markerStyles'
import { PITCH_STYLES, PITCH_STYLE_OPTIONS } from '../../../utils/pitchStyles'
import type { LabelDisplay, MarkerStyle, PitchStyle } from '../../../types'
import { MarkerVisual } from './MarkerVisual'

interface LineupAppearanceSheetProps {
  visible: boolean
  pitchStyle: PitchStyle
  markerStyle: MarkerStyle
  labelDisplay: LabelDisplay
  teamColor?: string
  keeperColor?: string
  onSelectPitchStyle: (style: PitchStyle) => void
  onSelectMarkerStyle: (style: MarkerStyle) => void
  onSelectLabelDisplay: (display: LabelDisplay) => void
  onSelectTeamColor: (color: string) => void
  onSelectKeeperColor: (color: string) => void
  onClose: () => void
}

const SWATCH_SIZE = 44
// Same 16:10 tile treatment as the canvas's BackgroundPicker, so the two pickers read as one.
const TILE_WIDTH = 148
const TILE_HEIGHT = 92
const TILE_MARGIN = 6
const MARKER_TILE_SIZE = 72

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// Everything about how a lineup LOOKS, in one sheet: the pitch surface, the marker shape and what
// it says, then the marker colors.
// Marker colors use the same preset-swatch mechanism as the canvas's ColorPicker, extended to two
// independent targets — every outfield marker shares teamColor, the goalkeeper's marker uses
// keeperColor instead (see LineupPosition.isKeeper).
export function LineupAppearanceSheet({
  visible,
  pitchStyle,
  markerStyle,
  labelDisplay,
  teamColor,
  keeperColor,
  onSelectPitchStyle,
  onSelectMarkerStyle,
  onSelectLabelDisplay,
  onSelectTeamColor,
  onSelectKeeperColor,
  onClose,
}: LineupAppearanceSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Appearance">
      <Text style={styles.label}>Pitch</Text>
      <View style={styles.tileRow}>
        {PITCH_STYLE_OPTIONS.map((option) => (
          <PitchStyleTile
            key={option.value}
            pitchStyle={option.value}
            label={option.label}
            isSelected={option.value === pitchStyle}
            onPress={() => onSelectPitchStyle(option.value)}
          />
        ))}
      </View>

      <Text style={[styles.label, styles.sectionLabel]}>Marker style</Text>
      <View style={styles.tileRow}>
        {MARKER_STYLE_OPTIONS.map((option) => (
          <MarkerStyleTile
            key={option.value}
            markerStyle={option.value}
            label={option.label}
            color={teamColor}
            isSelected={option.value === markerStyle}
            onPress={() => onSelectMarkerStyle(option.value)}
          />
        ))}
      </View>

      {/* Sits directly under Marker style: the two together are "what a marker looks like" (its
          shape) and "what it says" (its text), before the sheet moves on to color. */}
      <Text style={[styles.label, styles.sectionLabel]}>Marker label</Text>
      <SegmentedToggle options={LABEL_DISPLAY_OPTIONS} value={labelDisplay} onChange={onSelectLabelDisplay} />

      <Text style={[styles.label, styles.sectionLabel]}>Team color — every outfield player</Text>
      <SwatchRow selectedColor={teamColor} onSelect={onSelectTeamColor} />

      <Text style={[styles.label, styles.sectionLabel]}>Keeper color</Text>
      <SwatchRow selectedColor={keeperColor} onSelect={onSelectKeeperColor} />
    </BottomSheet>
  )
}

// The three tile/swatch components below are each their own component only so they can hold a
// press animation of their own — a hook can't be called inside the maps above. Each renders
// exactly the Pressable it replaced.
function PitchStyleTile({
  pitchStyle,
  label,
  isSelected,
  onPress,
}: {
  pitchStyle: PitchStyle
  label: string
  isSelected: boolean
  onPress: () => void
}) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.tileWrapper, press.animatedStyle]}
    >
      <View style={[styles.tile, isSelected && styles.tileSelected]}>
        {/* The preview is the real renderer, so it can never drift from the pitch itself. */}
        <Canvas style={styles.tileCanvas}>
          <PitchBackground
            background="full-pitch"
            width={TILE_WIDTH}
            height={TILE_HEIGHT}
            margin={TILE_MARGIN}
            style={PITCH_STYLES[pitchStyle]}
          />
        </Canvas>
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </AnimatedPressable>
  )
}

function MarkerStyleTile({
  markerStyle,
  label,
  color,
  isSelected,
  onPress,
}: {
  markerStyle: MarkerStyle
  label: string
  color?: string
  isSelected: boolean
  onPress: () => void
}) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.markerTileWrapper, press.animatedStyle]}
    >
      <View style={[styles.markerTile, isSelected && styles.tileSelected]}>
        {/* The preview is the real marker renderer, so it can never drift from the pitch. */}
        <MarkerVisual markerStyle={markerStyle} color={color} />
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </AnimatedPressable>
  )
}

function SwatchRow({ selectedColor, onSelect }: { selectedColor?: string; onSelect: (color: string) => void }) {
  return (
    <View style={styles.row}>
      {LINEUP_MARKER_SWATCHES.map((color) => (
        <Swatch
          key={color}
          color={color}
          isSelected={color.toLowerCase() === (selectedColor ?? '').toLowerCase()}
          onPress={() => onSelect(color)}
        />
      ))}
    </View>
  )
}

function Swatch({ color, isSelected, onPress }: { color: string; isSelected: boolean; onPress: () => void }) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      accessibilityLabel={color}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.swatchWrapper, press.animatedStyle]}
    >
      <View style={[styles.swatch, { backgroundColor: color }, isSelected && styles.swatchSelected]}>
        {/* Same contrast rule the marker text uses — a fixed white tick would disappear on
            the white swatch, which is exactly the one a coach reverting needs to see. */}
        {isSelected ? <Check size={18} color={getMarkerTextColor(color)} /> : null}
      </View>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    marginTop: spacing.lg,
  },
  tileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tileWrapper: {
    width: TILE_WIDTH,
  },
  tile: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  tileCanvas: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
  },
  markerTileWrapper: {
    width: MARKER_TILE_SIZE,
  },
  markerTile: {
    width: MARKER_TILE_SIZE,
    height: MARKER_TILE_SIZE,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  swatchWrapper: {
    width: SWATCH_SIZE + spacing.sm,
    height: SWATCH_SIZE + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
})
