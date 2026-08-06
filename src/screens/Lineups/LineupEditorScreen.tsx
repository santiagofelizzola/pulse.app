import { useNavigation } from '@react-navigation/native'
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'

import { colors, spacing, typography, layout } from '../../theme/theme'

export default function LineupEditorScreen() {
  const navigation = useNavigation()

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={layout.hitSlop}
          style={styles.backButton}
        >
          <Text style={styles.backLabel}>Close</Text>
        </Pressable>
      </SafeAreaView>
      <View style={styles.content}>
        <Text style={styles.title}>Lineup Editor</Text>
        <Text style={styles.body}>Squad size, formations, and player markers arrive in Session 5.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvasInk,
  },
  topBar: {
    backgroundColor: colors.overlayBar,
  },
  backButton: {
    height: layout.touchTarget,
    paddingHorizontal: layout.screenPaddingX,
    justifyContent: 'center',
  },
  backLabel: {
    ...typography.body,
    color: colors.textInverse,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingX,
  },
  title: {
    ...typography.h1,
    color: colors.textInverse,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.callout,
    color: colors.textInverse,
    textAlign: 'center',
  },
})
