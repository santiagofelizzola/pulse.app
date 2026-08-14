import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Canvas } from '@shopify/react-native-skia'
import { Check } from 'lucide-react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { SegmentedToggle } from '../../../components/ui/SegmentedToggle'
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
        {PITCH_STYLE_OPTIONS.map((option) => {
          const isSelected = option.value === pitchStyle
          return (
            <Pressable
              key={option.value}
              accessibilityLabel={option.label}
              onPress={() => onSelectPitchStyle(option.value)}
              style={styles.tileWrapper}
            >
              <View style={[styles.tile, isSelected && styles.tileSelected]}>
                {/* The preview is the real renderer, so it can never drift from the pitch itself. */}
                <Canvas style={styles.tileCanvas}>
                  <PitchBackground
                    background="full-pitch"
                    width={TILE_WIDTH}
                    height={TILE_HEIGHT}
                    margin={TILE_MARGIN}
                    style={PITCH_STYLES[option.value]}
                  />
                </Canvas>
              </View>
              <Text style={styles.tileLabel}>{option.label}</Text>
            </Pressable>
          )
        })}
      </View>

      <Text style={[styles.label, styles.sectionLabel]}>Marker style</Text>
      <View style={styles.tileRow}>
        {MARKER_STYLE_OPTIONS.map((option) => {
          const isSelected = option.value === markerStyle
          return (
            <Pressable
              key={option.value}
              accessibilityLabel={option.label}
              onPress={() => onSelectMarkerStyle(option.value)}
              style={styles.markerTileWrapper}
            >
              <View style={[styles.markerTile, isSelected && styles.tileSelected]}>
                {/* The preview is the real marker renderer, so it can never drift from the pitch. */}
                <MarkerVisual markerStyle={option.value} color={teamColor} />
              </View>
              <Text style={styles.tileLabel}>{option.label}</Text>
            </Pressable>
          )
        })}
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

function SwatchRow({ selectedColor, onSelect }: { selectedColor?: string; onSelect: (color: string) => void }) {
  return (
    <View style={styles.row}>
      {LINEUP_MARKER_SWATCHES.map((color) => {
        const isSelected = color.toLowerCase() === (selectedColor ?? '').toLowerCase()
        return (
          <Pressable key={color} accessibilityLabel={color} onPress={() => onSelect(color)} style={styles.swatchWrapper}>
            <View style={[styles.swatch, { backgroundColor: color }, isSelected && styles.swatchSelected]}>
              {/* Same contrast rule the marker text uses — a fixed white tick would disappear on
                  the white swatch, which is exactly the one a coach reverting needs to see. */}
              {isSelected ? <Check size={18} color={getMarkerTextColor(color)} /> : null}
            </View>
          </Pressable>
        )
      })}
    </View>
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
