import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Canvas } from '@shopify/react-native-skia'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import type { CanvasBackground } from '../../../types'
import { PitchBackground } from './PitchBackground'

interface BackgroundPickerProps {
  visible: boolean
  selected: CanvasBackground
  onSelect: (background: CanvasBackground) => void
  onClose: () => void
}

const OPTIONS: Array<{ value: CanvasBackground; label: string }> = [
  { value: 'full-pitch', label: 'Full pitch' },
  { value: 'half-pitch', label: 'Half pitch' },
  { value: 'final-third', label: 'Final third' },
  { value: 'middle-third', label: 'Middle third' },
  { value: 'penalty-box', label: 'Penalty box' },
  { value: 'blank', label: 'Blank' },
]

const TILE_WIDTH = 148
const TILE_HEIGHT = 92 // ~16:10
const TILE_MARGIN = 6

export function BackgroundPicker({ visible, selected, onSelect, onClose }: BackgroundPickerProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Background">
      <View style={styles.grid}>
        {OPTIONS.map((option) => {
          const isSelected = option.value === selected
          return (
            <Pressable key={option.value} onPress={() => onSelect(option.value)} style={styles.tileWrapper}>
              <View style={[styles.tile, isSelected && styles.tileSelected]}>
                <Canvas style={{ width: TILE_WIDTH, height: TILE_HEIGHT }}>
                  <PitchBackground background={option.value} width={TILE_WIDTH} height={TILE_HEIGHT} margin={TILE_MARGIN} />
                </Canvas>
              </View>
              <Text style={styles.tileLabel}>{option.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </BottomSheet>
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
