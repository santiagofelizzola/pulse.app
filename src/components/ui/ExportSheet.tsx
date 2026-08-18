import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { colors, layout, radius, spacing, typography } from '../../theme/theme'
import type { ExportDetail } from '../../utils/exportUtils'
import { BottomSheet } from './BottomSheet'
import { SegmentedToggle } from './SegmentedToggle'

interface ExportSheetProps {
  visible: boolean
  detail: ExportDetail
  // Sheet-level copy so the same component serves activities, lineups and sessions without
  // learning what a subject is.
  detailOptions: Array<{ value: ExportDetail; label: string }>
  // Omit for a subject that already has a name (anything loaded from the library). Provide it
  // for an unsaved drill or lineup, where the artifact has no name unless the coach types one
  // here. Exporting deliberately does NOT save — a share button that writes to the library
  // would be a surprising side effect.
  nameField?: { value: string; placeholder: string; onChange: (value: string) => void }
  // False hides the Simple/Full toggle entirely. An unsaved drill has no tag, duration, notes or
  // player actions — those are entered in SaveSheet — so 'full' would render identically to
  // 'simple', and offering a choice that changes nothing reads as a bug.
  detailMatters?: boolean
  hint?: string
  busy: boolean
  error: string | null
  onChangeDetail: (detail: ExportDetail) => void
  onShare: () => void
  onClose: () => void
}

export function ExportSheet({
  visible,
  detail,
  detailOptions,
  nameField,
  detailMatters = true,
  hint,
  busy,
  error,
  onChangeDetail,
  onShare,
  onClose,
}: ExportSheetProps) {
  const [name, setName] = useState(nameField?.value ?? '')

  useEffect(() => {
    if (visible) setName(nameField?.value ?? '')
    // Only re-seeds when the sheet opens, so typing isn't clobbered by a parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  function handleChangeName(next: string) {
    setName(next)
    nameField?.onChange(next)
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Export">
      {nameField ? (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Name (optional)</Text>
          <TextInput
            value={name}
            onChangeText={handleChangeName}
            placeholder={nameField.placeholder}
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />
        </View>
      ) : null}

      {detailMatters ? (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Detail</Text>
          <SegmentedToggle options={detailOptions} value={detail} onChange={onChangeDetail} />
        </View>
      ) : null}

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={onShare}
        disabled={busy}
        style={[styles.cta, busy && styles.ctaDisabled]}
        hitSlop={layout.hitSlop}
      >
        <Text style={[styles.ctaLabel, busy && styles.ctaLabelDisabled]}>{busy ? 'Preparing...' : 'Share'}</Text>
      </Pressable>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    height: 48,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    ...typography.body,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
  },
  cta: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  ctaDisabled: {
    backgroundColor: colors.surfaceSunken,
  },
  ctaLabel: {
    ...typography.label,
    color: colors.onPrimary,
  },
  ctaLabelDisabled: {
    color: colors.textDisabled,
  },
})
