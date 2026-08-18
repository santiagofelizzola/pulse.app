import { StyleSheet, Text, View } from 'react-native'

import { spacing } from '../../../theme/theme'
import type { ExportPalette } from '../../types'
import { artifactType } from './artifactStyles'

interface ArtifactFooterProps {
  palette: ExportPalette
  // Right-hand slot — a page number on session pages, nothing on a single image.
  trailing?: string
}

// The only text in an artifact allowed below the legibility floor: it carries no content a coach
// needs to read, just provenance.
export function ArtifactFooter({ palette, trailing }: ArtifactFooterProps) {
  return (
    <View style={[styles.row, { borderTopColor: palette.borderSubtle }]}>
      <Text style={[styles.text, { color: palette.textSecondary }]}>Pulse</Text>
      {trailing ? <Text style={[styles.text, { color: palette.textSecondary }]}>{trailing}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  text: {
    ...artifactType.footer,
  },
})
