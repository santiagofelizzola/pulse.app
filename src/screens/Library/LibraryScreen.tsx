import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'

import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { activityRepository } from '../../db/repositories/activityRepository'
import { navigate } from '../../navigation/rootNavigation'
import { colors, layout, radius, spacing, typography } from '../../theme/theme'
import type { Activity } from '../../types'

export default function LibraryScreen() {
  const [activities, setActivities] = useState<Activity[]>([])

  useFocusEffect(
    useCallback(() => {
      activityRepository.list().then(setActivities)
    }, [])
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="Library" />
      {activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.headline}>No activities yet</Text>
          <Text style={styles.supporting}>Save a drill from the canvas to start your library.</Text>
          <Pressable style={styles.cta} onPress={() => navigate('Canvas')}>
            <Text style={styles.ctaLabel}>Open canvas</Text>
          </Pressable>
        </View>
      ) : (
        // Minimal list — just proves the save path works end to end. The real Drills grid +
        // tag filter chips (design.md §6 Card spec) is Session 4's job.
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.thumbnailUri ? (
                <Image source={{ uri: item.thumbnailUri }} style={styles.thumbnail} />
              ) : (
                <View style={styles.thumbnailPlaceholder} />
              )}
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                {item.tag ? <Text style={styles.rowTag}>{item.tag}</Text> : null}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxxl,
  },
  headline: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  supporting: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.xl,
  },
  cta: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    ...typography.label,
    color: colors.primary,
  },
  list: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  rowTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  rowTag: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
})
