import { Trash2 } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, layout, radius, spacing, typography } from '../../../theme/theme'
import type { Session } from '../../../types'

interface SessionListItemProps {
  session: Session
  onPress: () => void
  onDelete: () => void
}

export function SessionListItem({ session, onPress, onDelete }: SessionListItemProps) {
  const blockCount = session.activities.length

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {session.name}
        </Text>
        <Text style={styles.subtitle}>
          {session.totalDurationMinutes} min · {blockCount} {blockCount === 1 ? 'block' : 'blocks'}
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
