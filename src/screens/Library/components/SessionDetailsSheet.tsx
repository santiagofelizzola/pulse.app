import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput } from 'react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, radius, spacing, typography } from '../../../theme/theme'

interface SessionDetailsSheetProps {
  visible: boolean
  initialFocus: string
  initialPlayerCount: number | undefined
  initialCoachingMoments: string
  onClose: () => void
  onSave: (patch: { focus?: string; playerCount?: number; coachingMoments?: string }) => void
}

// Session-level metadata — distinct from the per-block coaching points/duration reached from
// each SessionBlockCard. `playerCount` here is a session-level default; activities keep their
// own independent playerCount (set on the Canvas save sheet).
export function SessionDetailsSheet({
  visible,
  initialFocus,
  initialPlayerCount,
  initialCoachingMoments,
  onClose,
  onSave,
}: SessionDetailsSheetProps) {
  const [focus, setFocus] = useState(initialFocus)
  const [playerCountText, setPlayerCountText] = useState(initialPlayerCount ? String(initialPlayerCount) : '')
  const [coachingMoments, setCoachingMoments] = useState(initialCoachingMoments)

  useEffect(() => {
    if (visible) {
      setFocus(initialFocus)
      setPlayerCountText(initialPlayerCount ? String(initialPlayerCount) : '')
      setCoachingMoments(initialCoachingMoments)
    }
  }, [visible, initialFocus, initialPlayerCount, initialCoachingMoments])

  const parsed = parseInt(playerCountText, 10)
  const playerCount = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Session details">
      <Text style={styles.label}>Focus</Text>
      <TextInput
        value={focus}
        onChangeText={setFocus}
        placeholder="e.g. Playing out from the back"
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
        autoFocus
      />

      <Text style={styles.label}>Player count</Text>
      <TextInput
        value={playerCountText}
        onChangeText={setPlayerCountText}
        placeholder="e.g. 14"
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Coaching moments</Text>
      <TextInput
        value={coachingMoments}
        onChangeText={setCoachingMoments}
        placeholder={'One point per line.'}
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, styles.multilineInput]}
        multiline
        textAlignVertical="top"
      />

      <Pressable
        onPress={() => {
          onSave({
            focus: focus.trim() || undefined,
            playerCount,
            coachingMoments: coachingMoments.trim() || undefined,
          })
          onClose()
        }}
        style={styles.saveButton}
      >
        <Text style={styles.saveLabel}>Save</Text>
      </Pressable>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
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
  saveButton: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    ...typography.label,
    color: colors.onPrimary,
  },
})
