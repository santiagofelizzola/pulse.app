import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radius, spacing, typography } from '../../../theme/theme'
import { activityTagLabel } from '../../../utils/activityTags'
import type { Activity } from '../../../types'

interface ActivityCardProps {
  activity: Activity
  onPress: () => void
}

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  // A stored thumbnail_uri doesn't guarantee the file is still reachable (e.g. a stale path from
  // before migration 005) — fall back to the placeholder instead of leaving a broken image.
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      {activity.thumbnailUri && !imageFailed ? (
        <Image
          source={{ uri: activity.thumbnailUri }}
          style={styles.thumbnail}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={styles.thumbnailPlaceholder} />
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {activity.name}
        </Text>
        {activity.tag ? (
          <Text style={styles.tag} numberOfLines={1}>
            {activityTagLabel(activity.tag)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardPressed: {
    backgroundColor: colors.surfaceHover,
    transform: [{ scale: 0.99 }],
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceSunken,
  },
  thumbnailPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceSunken,
  },
  body: {
    padding: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  tag: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
})
