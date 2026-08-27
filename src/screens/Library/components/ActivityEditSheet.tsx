import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import { ACTIVITY_TAG_OPTIONS } from '../../../utils/activityTags'
import type { Activity, ActivityTag } from '../../../types'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface ActivityEditSheetProps {
  visible: boolean
  activity: Activity | null
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (patch: {
    name: string
    tag?: ActivityTag
    durationMinutes?: number
    notes?: string
    playerCount?: number
    playerActions?: string
  }) => void
}

// Metadata-only edit — the canvas diagram itself isn't re-editable from the library.
export function ActivityEditSheet({ visible, activity, saving, error, onClose, onSave }: ActivityEditSheetProps) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState<ActivityTag | undefined>(undefined)
  const [durationText, setDurationText] = useState('')
  const [notes, setNotes] = useState('')
  const [playerCountText, setPlayerCountText] = useState('')
  const [playerActions, setPlayerActions] = useState('')

  useEffect(() => {
    if (visible && activity) {
      setName(activity.name)
      setTag(activity.tag)
      setDurationText(activity.durationMinutes ? String(activity.durationMinutes) : '')
      setNotes(activity.notes ?? '')
      setPlayerCountText(activity.playerCount ? String(activity.playerCount) : '')
      setPlayerActions(activity.playerActions ?? '')
    }
  }, [visible, activity])

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && !saving

  const parsedDuration = parseInt(durationText, 10)
  const durationMinutes = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined

  const parsedPlayerCount = parseInt(playerCountText, 10)
  const playerCount = Number.isFinite(parsedPlayerCount) && parsedPlayerCount > 0 ? parsedPlayerCount : undefined

  const savePress = usePressAnimation()

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit drill">
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Rondo warm-up"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />

        <Text style={styles.label}>Tag (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {ACTIVITY_TAG_OPTIONS.map((option) => {
            const selected = tag === option.value
            return (
              <TagChip
                key={option.value}
                label={option.label}
                selected={selected}
                onPress={() => setTag(selected ? undefined : option.value)}
              />
            )
          })}
        </ScrollView>

        <Text style={styles.label}>Duration (minutes, optional)</Text>
        <TextInput
          value={durationText}
          onChangeText={setDurationText}
          placeholder="e.g. 15"
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="General notes about this drill"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, styles.multilineInput]}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Player count (optional)</Text>
        <TextInput
          value={playerCountText}
          onChangeText={setPlayerCountText}
          placeholder="e.g. 8"
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Player actions (optional)</Text>
        <TextInput
          value={playerActions}
          onChangeText={setPlayerActions}
          placeholder="What do players do in this drill?"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, styles.multilineInput]}
          multiline
          textAlignVertical="top"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AnimatedPressable
          disabled={!canSave}
          onPress={() =>
            onSave({
              name: trimmedName,
              tag,
              durationMinutes,
              notes: notes.trim() || undefined,
              playerCount,
              playerActions: playerActions.trim() || undefined,
            })
          }
          onPressIn={savePress.onPressIn}
          onPressOut={savePress.onPressOut}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled, savePress.animatedStyle]}
        >
          {saving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>Save</Text>
          )}
        </AnimatedPressable>
      </ScrollView>
    </BottomSheet>
  )
}

// Its own component only so each chip can hold a press animation of its own — a hook can't be
// called inside the map above. Renders exactly the Pressable it replaced.
function TagChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.chip, selected && styles.chipSelected, press.animatedStyle]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 480,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    height: 48,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  multilineInput: {
    height: undefined,
    minHeight: 96,
    paddingVertical: spacing.md,
  },
  chipRow: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  chip: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primaryTint,
    borderColor: 'transparent',
  },
  chipLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: colors.primary,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.md,
  },
  saveButton: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.surfaceSunken,
  },
  saveLabel: {
    ...typography.label,
    color: colors.onPrimary,
  },
  saveLabelDisabled: {
    color: colors.textDisabled,
  },
})
