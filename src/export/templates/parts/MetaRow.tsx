import { Fragment } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { fonts, radius, spacing } from '../../../theme/theme'
import type { ExportPalette } from '../../types'
import { artifactType } from './artifactStyles'

interface MetaRowProps {
  // Rendered as a tinted chip at the head of the row.
  chip?: string
  // Rendered after the chip, separated by middots. Falsy entries are dropped by the caller.
  items: string[]
  palette: ExportPalette
}

// The one-line "tag · 12 min · 10 players" strip under an artifact title. Collapses to nothing
// when a record carries none of them.
export function MetaRow({ chip, items, palette }: MetaRowProps) {
  if (!chip && items.length === 0) return null

  return (
    <View style={styles.row}>
      {chip ? (
        <View style={[styles.chip, { backgroundColor: palette.surfaceSunken }]}>
          <Text style={[styles.chipLabel, { color: palette.textSecondary }]}>{chip}</Text>
        </View>
      ) : null}
      {items.map((item, index) => (
        <Fragment key={`${index}-${item}`}>
          {index > 0 || chip ? <Text style={[styles.separator, { color: palette.border }]}>·</Text> : null}
          <Text style={[styles.item, { color: palette.textSecondary }]}>{item}</Text>
        </Fragment>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    height: 26,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    ...artifactType.overline,
    fontFamily: fonts.semibold,
  },
  item: {
    ...artifactType.meta,
  },
  separator: {
    ...artifactType.meta,
  },
})
