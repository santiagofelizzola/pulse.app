import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { Canvas } from '@shopify/react-native-skia'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import { CANVAS_BACKGROUND_OPTIONS } from '../../../utils/canvasBackgrounds'
import type { CanvasBackground } from '../../../types'
import { PitchBackground } from './PitchBackground'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface BackgroundPickerProps {
  visible: boolean
  selected: CanvasBackground
  onSelect: (background: CanvasBackground) => void
  onClose: () => void
}

const TILE_WIDTH = 148
const TILE_HEIGHT = 92 // ~16:10
const TILE_MARGIN = 6

export function BackgroundPicker({ visible, selected, onSelect, onClose }: BackgroundPickerProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Background">
      {/* Seven tiles since the blank splits arrived and middle-third left: the grid wraps two per
          row on any supported width, so this is four rows with a single tile on the last. */}
      <View style={styles.grid}>
        {CANVAS_BACKGROUND_OPTIONS.map((option) => (
          <BackgroundTile
            key={option.value}
            background={option.value}
            label={option.label}
            isSelected={option.value === selected}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
    </BottomSheet>
  )
}

// Its own component only so each tile can hold a press animation of its own — a hook can't be
// called inside the map above. Renders exactly the Pressable it replaced.
function BackgroundTile({
  background,
  label,
  isSelected,
  onPress,
}: {
  background: CanvasBackground
  label: string
  isSelected: boolean
  onPress: () => void
}) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.tileWrapper, press.animatedStyle]}
    >
      <View style={[styles.tile, isSelected && styles.tileSelected]}>
        <Canvas style={{ width: TILE_WIDTH, height: TILE_HEIGHT }}>
          <PitchBackground background={background} width={TILE_WIDTH} height={TILE_HEIGHT} margin={TILE_MARGIN} />
        </Canvas>
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  grid: {
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
  tileLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
})
