import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import { ACTIVITY_TAG_OPTIONS } from '../../../utils/activityTags'
import type { ActivityTag } from '../../../types'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface SaveSheetProps {
  visible: boolean
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (input: { name: string; tag?: ActivityTag; playerCount?: number; playerActions?: string }) => void
}

export function SaveSheet({ visible, saving, error, onClose, onSave }: SaveSheetProps) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState<ActivityTag | undefined>(undefined)
  const [playerCountText, setPlayerCountText] = useState('')
  const [playerActions, setPlayerActions] = useState('')

  useEffect(() => {
    if (visible) {
      setName('')
      setTag(undefined)
      setPlayerCountText('')
      setPlayerActions('')
    }
  }, [visible])

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && !saving
  const parsedPlayerCount = parseInt(playerCountText, 10)
  const playerCount = Number.isFinite(parsedPlayerCount) && parsedPlayerCount > 0 ? parsedPlayerCount : undefined
  const savePress = usePressAnimation()

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Save activity">
      {/* Same capped-and-scrolling treatment ActivityEditSheet uses. keyboardShouldPersistTaps is
          the one addition: this sheet autofocuses Name, so the keyboard is already up when the
          list first renders, and the default ("never") would let the first tap on a tag chip or
          on Save be swallowed by the keyboard dismissal instead of reaching the control. */}
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Rondo warm-up"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          autoFocus
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
          onPress={() => onSave({ name: trimmedName, tag, playerCount, playerActions: playerActions.trim() || undefined })}
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
  // This sheet's natural content is 450pt (Name 28+64, Tag 28+50, Player count 28+64, Player
  // actions 28+112, Save 48; 480 with an error line) and it autofocuses Name, so it has to fit
  // above the keyboard from the moment it opens. Worst case is the shortest supported phone:
  // 667 - 20 status - 260 keyboard = 387 for the sheet, less BottomSheet's own 76 of chrome
  // (paddingTop 12 + grabber 4+16 + title 28+16) and 24 of bottom padding = 287 for content.
  // A 390x844 phone gives 327, so the short phone binds. 280 sits just inside it, on the 4px grid.
  // ActivityEditSheet's cap is larger (480) because it does NOT autofocus — its keyboard is down
  // on open, so it only has to fit the no-keyboard case.
  scroll: {
    maxHeight: 280,
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
