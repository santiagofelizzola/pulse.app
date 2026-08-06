import { SafeAreaView, StyleSheet, Text, View } from 'react-native'

import { colors, spacing, typography, layout } from '../../theme/theme'

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>Pulse</Text>
        <Text style={styles.body}>
          Plan training sessions and set matchday lineups — all on your device.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
})
