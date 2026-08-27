import { useEffect, useState } from 'react'
import { Check } from 'lucide-react-native'
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { activityRepository } from '../../../db/repositories/activityRepository'
import { colors, layout, radius, spacing, typography } from '../../../theme/theme'
import { activityTagLabel } from '../../../utils/activityTags'
import type { Activity, ActivityTag } from '../../../types'
import { FilterChipRow } from './FilterChipRow'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface ActivityPickerSheetProps {
  visible: boolean
  onClose: () => void
  onSelect: (activities: Activity[]) => void
}

export function ActivityPickerSheet({ visible, onClose, onSelect }: ActivityPickerSheetProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedTag, setSelectedTag] = useState<ActivityTag | undefined>(undefined)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // A stored thumbnail_uri doesn't guarantee the file is still reachable — track failed loads by
  // activity id and fall back to the placeholder instead of leaving a broken image.
  const [failedThumbnailIds, setFailedThumbnailIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (visible) {
      setSelectedTag(undefined)
      setSelectedIds(new Set())
      activityRepository.list().then(setActivities)
    }
  }, [visible])

  const filtered = selectedTag ? activities.filter((activity) => activity.tag === selectedTag) : activities

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleConfirm() {
    if (selectedIds.size === 0) return
    // Preserve list order rather than tap order — reads more predictably once added as blocks.
    onSelect(activities.filter((activity) => selectedIds.has(activity.id)))
  }

  const confirmPress = usePressAnimation()

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add activities">
      {/* FilterChipRow carries its own screenPaddingX inset — cancel the sheet's own padding
          so the chip row bleeds to the true sheet edges instead of double-inseting. */}
      <View style={styles.chipRow}>
        <FilterChipRow selected={selectedTag} onSelect={setSelectedTag} />
      </View>
      {filtered.length === 0 ? (
        <Text style={styles.empty}>No saved drills{selectedTag ? ' match this filter' : ''}.</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ActivityRow
              activity={item}
              selected={selectedIds.has(item.id)}
              thumbnailFailed={failedThumbnailIds.has(item.id)}
              onThumbnailError={() => setFailedThumbnailIds((prev) => new Set(prev).add(item.id))}
              onPress={() => toggleSelected(item.id)}
            />
          )}
        />
      )}
      <AnimatedPressable
        disabled={selectedIds.size === 0}
        onPress={handleConfirm}
        onPressIn={confirmPress.onPressIn}
        onPressOut={confirmPress.onPressOut}
        style={[
          styles.confirmButton,
          selectedIds.size === 0 && styles.confirmButtonDisabled,
          confirmPress.animatedStyle,
        ]}
      >
        <Text style={[styles.confirmLabel, selectedIds.size === 0 && styles.confirmLabelDisabled]}>
          {selectedIds.size === 0
            ? 'Add activities'
            : `Add ${selectedIds.size} ${selectedIds.size === 1 ? 'activity' : 'activities'}`}
        </Text>
      </AnimatedPressable>
    </BottomSheet>
  )
}

// Its own component only so each row can hold a press animation of its own — a hook can't be
// called inside FlatList's renderItem, which is a render prop rather than a component. Renders
// exactly the Pressable it replaced.
function ActivityRow({
  activity,
  selected,
  thumbnailFailed,
  onThumbnailError,
  onPress,
}: {
  activity: Activity
  selected: boolean
  thumbnailFailed: boolean
  onThumbnailError: () => void
  onPress: () => void
}) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.row, press.animatedStyle]}
    >
      {activity.thumbnailUri && !thumbnailFailed ? (
        <Image source={{ uri: activity.thumbnailUri }} style={styles.thumbnail} onError={onThumbnailError} />
      ) : (
        <View style={styles.thumbnailPlaceholder} />
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {activity.name}
        </Text>
        {activity.tag ? <Text style={styles.rowTag}>{activityTagLabel(activity.tag)}</Text> : null}
      </View>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? <Check size={14} color={colors.onPrimary} /> : null}
      </View>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  chipRow: {
    marginHorizontal: -layout.screenPaddingX,
    marginBottom: spacing.lg,
  },
  empty: {
    ...typography.callout,
    color: colors.textSecondary,
    paddingVertical: spacing.xl,
  },
  list: {
    maxHeight: 380,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
  },
  thumbnailPlaceholder: {
    width: 48,
    height: 48,
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  confirmButton: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.surfaceSunken,
  },
  confirmLabel: {
    ...typography.label,
    color: colors.onPrimary,
  },
  confirmLabelDisabled: {
    color: colors.textDisabled,
  },
})
