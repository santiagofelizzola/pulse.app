import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'

import { navigate } from '../../navigation/rootNavigation'
import { colors, spacing, typography, layout, radius } from '../../theme/theme'

export default function LineupsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Lineups</Text>
        <Pressable
          onPress={() => navigate('LineupEditor')}
          hitSlop={layout.hitSlop}
          style={styles.addButton}
        >
          <Text style={styles.addLabel}>+</Text>
        </Pressable>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  addButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    ...typography.h2,
    color: colors.primary,
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
