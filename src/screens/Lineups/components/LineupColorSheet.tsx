import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import { OBJECT_COLOR_SWATCHES } from '../../../utils/canvasUtils'

interface LineupColorSheetProps {
  visible: boolean
  teamColor?: string
  keeperColor?: string
  onSelectTeamColor: (color: string) => void
  onSelectKeeperColor: (color: string) => void
  onClose: () => void
}

const SWATCH_SIZE = 44

// Same preset-swatch mechanism as the canvas's ColorPicker (cone/disc/player marker), extended
// to two independent targets — every outfield marker shares teamColor, the goalkeeper's marker
// uses keeperColor instead (see LineupPosition.isKeeper).
export function LineupColorSheet({
  visible,
  teamColor,
  keeperColor,
  onSelectTeamColor,
  onSelectKeeperColor,
  onClose,
}: LineupColorSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Marker colors">
      <Text style={styles.label}>Team color — every outfield player</Text>
      <SwatchRow selectedColor={teamColor} onSelect={onSelectTeamColor} />

      <Text style={[styles.label, styles.secondLabel]}>Keeper color</Text>
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
  secondLabel: {
    marginTop: spacing.lg,
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
