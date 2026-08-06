import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import HomeScreen from '../screens/Home/HomeScreen'
import LibraryScreen from '../screens/Library/LibraryScreen'
import LineupsScreen from '../screens/Lineups/LineupsScreen'
import { colors, typography, radius, shadow, spacing } from '../theme/theme'
import { navigate } from './rootNavigation'
import type { TabParamList, LibraryStackParamList, LineupsStackParamList } from './types'

const Tab = createBottomTabNavigator<TabParamList>()
const LibraryStackNav = createNativeStackNavigator<LibraryStackParamList>()
const LineupsStackNav = createNativeStackNavigator<LineupsStackParamList>()

function LibraryStack() {
  return (
    <LibraryStackNav.Navigator screenOptions={{ headerShown: false }}>
      <LibraryStackNav.Screen name="Library" component={LibraryScreen} />
      {/* SessionBuilderScreen and ActivityDetailScreen are added in Session 4 */}
    </LibraryStackNav.Navigator>
  )
}

function LineupsStack() {
  return (
    <LineupsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <LineupsStackNav.Screen name="Lineups" component={LineupsScreen} />
    </LineupsStackNav.Navigator>
  )
}

// The Create tab has no screen of its own — it just opens the Canvas modal.
function CreatePlaceholder() {
  return null
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[styles.tabLabel, { color: focused ? colors.primary : colors.textTertiary }]}>
      {label}
    </Text>
  )
}

function CreateTabButton() {
  return (
    <View style={styles.createButtonWrapper} pointerEvents="box-none">
      <Pressable
        onPress={() => navigate('Canvas')}
        style={({ pressed }) => [styles.createButton, pressed && styles.createButtonPressed]}
      >
        <Text style={styles.createButtonLabel}>+</Text>
      </Pressable>
    </View>
  )
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreatePlaceholder}
        options={{
          tabBarButton: () => <CreateTabButton />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault()
            navigate('Canvas')
          },
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryStack}
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="Library" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Lineups"
        component={LineupsStack}
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="Lineups" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    height: 56,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  tabLabel: {
    ...typography.caption,
  },
  createButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -spacing.md,
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  createButtonPressed: {
    backgroundColor: colors.primaryPressed,
    transform: [{ scale: 0.94 }],
  },
  createButtonLabel: {
    ...typography.h1,
    color: colors.onPrimary,
    lineHeight: 32,
  },
})
