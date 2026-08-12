import { Trash2 } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, layout, radius, spacing, typography } from '../../../theme/theme'
import type { Lineup } from '../../../types'

interface LineupListItemProps {
  lineup: Lineup
  onPress: () => void
  onDelete: () => void
}

export function LineupListItem({ lineup, onPress, onDelete }: LineupListItemProps) {
  const formationLabel = lineup.formation === 'custom' ? 'Custom' : lineup.formation

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {lineup.name}
        </Text>
        <Text style={styles.subtitle}>
          {lineup.squadSize}v{lineup.squadSize}
          {formationLabel ? ` · ${formationLabel}` : ''}
        </Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={layout.hitSlop} style={styles.deleteButton}>
        <Trash2 size={20} color={colors.error} />
      </Pressable>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  rowPressed: {
    backgroundColor: colors.surfaceHover,
  },
  text: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  deleteButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
