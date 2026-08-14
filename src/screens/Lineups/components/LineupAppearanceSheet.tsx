import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Canvas } from '@shopify/react-native-skia'
import { Check } from 'lucide-react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { PitchBackground } from '../../Canvas/components/PitchBackground'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import { OBJECT_COLOR_SWATCHES } from '../../../utils/canvasUtils'
import { MARKER_STYLE_OPTIONS } from '../../../utils/markerStyles'
import { PITCH_STYLES, PITCH_STYLE_OPTIONS } from '../../../utils/pitchStyles'
import type { MarkerStyle, PitchStyle } from '../../../types'
import { MarkerVisual } from './MarkerVisual'

interface LineupAppearanceSheetProps {
  visible: boolean
  pitchStyle: PitchStyle
  markerStyle: MarkerStyle
  teamColor?: string
  keeperColor?: string
  onSelectPitchStyle: (style: PitchStyle) => void
  onSelectMarkerStyle: (style: MarkerStyle) => void
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

// Everything about how a lineup LOOKS, in one sheet: the pitch surface, then the marker colors.
// Marker colors use the same preset-swatch mechanism as the canvas's ColorPicker, extended to two
// independent targets — every outfield marker shares teamColor, the goalkeeper's marker uses
// keeperColor instead (see LineupPosition.isKeeper).
export function LineupAppearanceSheet({
  visible,
  pitchStyle,
  markerStyle,
  teamColor,
  keeperColor,
  onSelectPitchStyle,
  onSelectMarkerStyle,
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
                <MarkerVisual markerStyle={option.value} color={teamColor} showRole={false} />
              </View>
              <Text style={styles.tileLabel}>{option.label}</Text>
            </Pressable>
          )
        })}
      </View>

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
      {OBJECT_COLOR_SWATCHES.map((color) => {
        const isSelected = color.toLowerCase() === (selectedColor ?? '').toLowerCase()
        return (
          <Pressable key={color} accessibilityLabel={color} onPress={() => onSelect(color)} style={styles.swatchWrapper}>
            <View style={[styles.swatch, { backgroundColor: color }, isSelected && styles.swatchSelected]}>
              {isSelected ? <Check size={18} color={colors.textInverse} /> : null}
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
