import { StyleSheet, Text, View } from 'react-native'

import { fonts, spacing } from '../../../theme/theme'
import type { ExportPalette } from '../../types'
import { artifactType } from './artifactStyles'

interface NotesBlockProps {
  label: string
  body: string
  palette: ExportPalette
}

// A labelled paragraph. Renders nothing for an empty body, which is what lets the 'full' detail
// level degrade cleanly to 'simple' on a sparsely filled record instead of showing bare headers.
export function NotesBlock({ label, body, palette }: NotesBlockProps) {
  if (!body.trim()) return null

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.body, { color: palette.textPrimary }]}>{body.trim()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  label: {
    ...artifactType.sectionLabel,
    fontFamily: fonts.semibold,
    marginBottom: spacing.xs,
  },
  body: {
    ...artifactType.body,
  },
})
