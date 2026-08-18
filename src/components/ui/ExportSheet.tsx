import { Pressable, StyleSheet, Text, View } from 'react-native'

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
  hint,
  busy,
  error,
  onChangeDetail,
  onShare,
  onClose,
}: ExportSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Export">
      <Text style={styles.fieldLabel}>Detail</Text>
      <SegmentedToggle options={detailOptions} value={detail} onChange={onChangeDetail} />

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={onShare}
        disabled={busy}
        style={[styles.cta, busy && styles.ctaDisabled]}
        hitSlop={layout.hitSlop}
      >
        <Text style={[styles.ctaLabel, busy && styles.ctaLabelDisabled]}>{busy ? 'Preparing…' : 'Share'}</Text>
      </Pressable>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.md,
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
