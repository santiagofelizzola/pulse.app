import { useCallback, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Trash2 } from 'lucide-react-native'
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'

import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { activityRepository } from '../../db/repositories/activityRepository'
import type { LibraryStackParamList } from '../../navigation/types'
import { colors, layout, radius, spacing, typography } from '../../theme/theme'
import { activityTagLabel } from '../../utils/activityTags'
import type { Activity } from '../../types'

type Route = RouteProp<LibraryStackParamList, 'ActivityDetail'>

export default function ActivityDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>()
  const { params } = useRoute<Route>()
  const [activity, setActivity] = useState<Activity | null>(null)

  useFocusEffect(
    useCallback(() => {
      activityRepository.getById(params.activityId).then(setActivity)
    }, [params.activityId])
  )

  const handleDelete = useCallback(() => {
    if (!activity) return
    Alert.alert('Delete activity?', `"${activity.name}" will be removed from your library.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await activityRepository.delete(activity.id)
          navigation.goBack()
        },
      },
    ])
  }, [activity, navigation])

  if (!activity) {
    return <SafeAreaView style={styles.safeArea} />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={activity.name}
        onBack={() => navigation.goBack()}
        trailing={
          <Pressable onPress={handleDelete} hitSlop={layout.hitSlop} style={styles.deleteButton}>
            <Trash2 size={22} color={colors.error} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {activity.thumbnailUri ? (
          <Image source={{ uri: activity.thumbnailUri }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder} />
        )}

        <View style={styles.metaRow}>
          {activity.tag ? (
            <View style={styles.tagChip}>
              <Text style={styles.tagChipLabel}>{activityTagLabel(activity.tag)}</Text>
            </View>
          ) : null}
          {activity.durationMinutes ? <Text style={styles.duration}>{activity.durationMinutes} min</Text> : null}
        </View>

        {activity.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesBody}>{activity.notes}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  deleteButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.xxl,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  thumbnailPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  tagChip: {
    height: 22,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagChipLabel: {
    ...typography.overline,
    color: colors.primary,
  },
  duration: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  notesSection: {
    marginTop: spacing.xl,
  },
  notesLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  notesBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
})
