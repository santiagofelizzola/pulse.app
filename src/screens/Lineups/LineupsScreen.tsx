import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'

import { HeaderActionButton, ScreenHeader } from '../../components/ui/ScreenHeader'
import { navigate } from '../../navigation/rootNavigation'
import { colors, spacing, typography, radius } from '../../theme/theme'

export default function LineupsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Lineups"
        trailing={<HeaderActionButton label="+" onPress={() => navigate('LineupEditor')} />}
      />
      <View style={styles.emptyState}>
        <Text style={styles.headline}>No lineups yet</Text>
        <Text style={styles.supporting}>
          Set your matchday lineup and save it for the weekend.
        </Text>
        <Pressable style={styles.cta} onPress={() => navigate('LineupEditor')}>
          <Text style={styles.ctaLabel}>New lineup</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
