import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'

import { navigate } from '../../navigation/rootNavigation'
import { colors, spacing, typography, layout, radius } from '../../theme/theme'

export default function LibraryScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
      </View>
      <View style={styles.emptyState}>
        <Text style={styles.headline}>No activities yet</Text>
        <Text style={styles.supporting}>
          Save a drill from the canvas to start your library.
        </Text>
        <Pressable style={styles.cta} onPress={() => navigate('Canvas')}>
          <Text style={styles.ctaLabel}>Open canvas</Text>
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
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
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
