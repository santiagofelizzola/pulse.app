import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'

import { HeaderActionButton, ScreenHeader } from '../../components/ui/ScreenHeader'
import { lineupRepository } from '../../db/repositories/lineupRepository'
import { navigate } from '../../navigation/rootNavigation'
import { colors, layout, radius, spacing, typography } from '../../theme/theme'
import type { Lineup } from '../../types'
import { LineupListItem } from './components/LineupListItem'

export default function LineupsScreen() {
  const [lineups, setLineups] = useState<Lineup[]>([])

  useFocusEffect(
    useCallback(() => {
      lineupRepository.list().then(setLineups)
    }, [])
  )

  const handleDelete = useCallback((lineup: Lineup) => {
    Alert.alert('Delete lineup?', `"${lineup.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await lineupRepository.delete(lineup.id)
          setLineups(await lineupRepository.list())
        },
      },
    ])
  }, [])

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Lineups"
        trailing={<HeaderActionButton label="+" onPress={() => navigate('LineupEditor')} />}
      />

      {lineups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.headline}>No lineups yet</Text>
          <Text style={styles.supporting}>
            Set your matchday lineup and save it for the weekend.
          </Text>
          <Pressable style={styles.cta} onPress={() => navigate('LineupEditor')}>
            <Text style={styles.ctaLabel}>New lineup</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={lineups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <LineupListItem
              lineup={item}
              onPress={() => navigate('LineupEditor', { lineupId: item.id })}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxxl,
  },
  headline: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  supporting: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.xl,
  },
  cta: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    ...typography.label,
    color: colors.primary,
  },
})
