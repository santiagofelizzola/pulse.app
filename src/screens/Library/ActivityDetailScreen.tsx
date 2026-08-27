import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pencil, Share2, Trash2 } from 'lucide-react-native'
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { ExportSheet } from '../../components/ui/ExportSheet'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { usePressAnimation } from '../../components/ui/usePressAnimation'
import { getPitchAspectRatio } from '../Canvas/components/PitchBackground'
import { activityRepository } from '../../db/repositories/activityRepository'
import type { LibraryStackParamList } from '../../navigation/types'
import { colors, layout, radius, spacing, typography } from '../../theme/theme'
import { activityTagLabel } from '../../utils/activityTags'
import { useShareExport } from '../../export/useShareExport'
import { exportActivity } from '../../utils/exportUtils'
import type { Activity, ActivityTag } from '../../types'
import { ActivityEditSheet } from './components/ActivityEditSheet'

type Route = RouteProp<LibraryStackParamList, 'ActivityDetail'>

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export default function ActivityDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>()
  const { params } = useRoute<Route>()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // A stored thumbnail_uri doesn't guarantee the file is still reachable — fall back to the
  // placeholder instead of leaving a broken image.
  const [imageFailed, setImageFailed] = useState(false)
  const [exportSheetOpen, setExportSheetOpen] = useState(false)
  const { busy: exporting, share } = useShareExport()
  // Declared up here, not beside the buttons: this screen returns early while `activity` is null.
  const sharePress = usePressAnimation()
  const editPress = usePressAnimation()
  const deletePress = usePressAnimation()

  useFocusEffect(
    useCallback(() => {
      activityRepository.getById(params.activityId).then(setActivity)
    }, [params.activityId])
  )

  useEffect(() => {
    setImageFailed(false)
  }, [activity?.thumbnailUri])

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

  const handleSaveEdit = useCallback(
    async (patch: {
      name: string
      tag?: ActivityTag
      durationMinutes?: number
      notes?: string
      playerCount?: number
      playerActions?: string
    }) => {
      if (!activity) return
      setSaving(true)
      setSaveError(null)
      try {
        const updated = await activityRepository.update(activity.id, patch)
        if (updated) setActivity(updated)
        setEditSheetOpen(false)
      } catch {
        setSaveError('Could not save. Try again.')
      } finally {
        setSaving(false)
      }
    },
    [activity]
  )

  const handleShare = useCallback(() => {
    if (!activity) return
    return share(
      () => setExportSheetOpen(false),
      () => exportActivity(activity, { detail: 'simple' })
    )
  }, [activity, share])

  if (!activity) {
    return <SafeAreaView style={styles.safeArea} />
  }

  // The saved thumbnail file already captures the full canvas at its real aspect ratio (see
  // captureCanvasThumbnail) — the container just needs to match that ratio instead of forcing a
  // square, otherwise `contain`/`cover` crops or letterboxes the picture unpredictably.
  const thumbnailAspectRatio = getPitchAspectRatio(activity.canvasData.background)

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={activity.name}
        onBack={() => navigation.goBack()}
        trailing={
          <View style={styles.headerActions}>
            <AnimatedPressable
              onPress={() => setExportSheetOpen(true)}
              onPressIn={sharePress.onPressIn}
              onPressOut={sharePress.onPressOut}
              hitSlop={layout.hitSlop}
              style={[styles.headerActionButton, sharePress.animatedStyle]}
            >
              <Share2 size={20} color={colors.textPrimary} />
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => setEditSheetOpen(true)}
              onPressIn={editPress.onPressIn}
              onPressOut={editPress.onPressOut}
              hitSlop={layout.hitSlop}
              style={[styles.headerActionButton, editPress.animatedStyle]}
            >
              <Pencil size={20} color={colors.textPrimary} />
            </AnimatedPressable>
            <AnimatedPressable
              onPress={handleDelete}
              onPressIn={deletePress.onPressIn}
              onPressOut={deletePress.onPressOut}
              hitSlop={layout.hitSlop}
              style={[styles.headerActionButton, deletePress.animatedStyle]}
            >
              <Trash2 size={22} color={colors.error} />
            </AnimatedPressable>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {activity.thumbnailUri && !imageFailed ? (
          <Image
            source={{ uri: activity.thumbnailUri }}
            style={[styles.thumbnail, { aspectRatio: thumbnailAspectRatio }]}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={[styles.thumbnailPlaceholder, { aspectRatio: thumbnailAspectRatio }]} />
        )}

        <View style={styles.metaRow}>
          {activity.tag ? (
            <View style={styles.tagChip}>
              <Text style={styles.tagChipLabel}>{activityTagLabel(activity.tag)}</Text>
            </View>
          ) : null}
          {activity.durationMinutes ? <Text style={styles.duration}>{activity.durationMinutes} min</Text> : null}
          {activity.playerCount ? <Text style={styles.duration}>{activity.playerCount} players</Text> : null}
        </View>

        {activity.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesBody}>{activity.notes}</Text>
          </View>
        ) : null}

        {activity.playerActions ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Player actions</Text>
            <Text style={styles.notesBody}>{activity.playerActions}</Text>
          </View>
        ) : null}
      </ScrollView>

      <ActivityEditSheet
        visible={editSheetOpen}
        activity={activity}
        saving={saving}
        error={saveError}
        onClose={() => setEditSheetOpen(false)}
        onSave={handleSaveEdit}
      />

      <ExportSheet
        visible={exportSheetOpen}
        detail="simple"
        detailOptions={[]}
        // No Simple/Full choice: the export is the diagram exactly as drawn. See ExportSheet.
        detailMatters={false}
        hint="A PNG image of the diagram, exactly as drawn."
        busy={exporting}
        error={null}
        onChangeDetail={() => {}}
        onShare={handleShare}
        onClose={() => setExportSheetOpen(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
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
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  thumbnailPlaceholder: {
    width: '100%',
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
