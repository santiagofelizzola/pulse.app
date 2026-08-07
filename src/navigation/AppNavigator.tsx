import { soccerBall, soccerPitch } from '@lucide/lab'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Folder, Icon } from 'lucide-react-native'
import { StyleSheet, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import LibraryScreen from '../screens/Library/LibraryScreen'
import LineupsScreen from '../screens/Lineups/LineupsScreen'
import { colors, typography, spacing, fonts } from '../theme/theme'
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

// The Training tab has no screen of its own — its tabPress is intercepted to open the Canvas modal.
function TrainingPlaceholder() {
  return null
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={[styles.tabLabel, { color: focused ? colors.primary : colors.textTertiary }]}
      numberOfLines={1}
    >
      {label}
    </Text>
  )
}

export default function AppNavigator() {
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: 56 + insets.bottom, paddingBottom: insets.bottom }],
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen
        name="Library"
        component={LibraryStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <Folder size={24} color={focused ? colors.primary : colors.textTertiary} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Library" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Training"
        component={TrainingPlaceholder}
        options={{
          tabBarIcon: ({ focused }) => (
            <Icon
              iconNode={soccerBall}
              size={24}
              color={focused ? colors.primary : colors.textTertiary}
            />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Training" focused={focused} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault()
            navigate('Canvas')
          },
        }}
      />
      <Tab.Screen
        name="Lineups"
        component={LineupsStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <Icon
              iconNode={soccerPitch}
              size={24}
              color={focused ? colors.primary : colors.textTertiary}
            />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Lineups" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  tabBarItem: {
    flex: 1,
  },
  tabLabel: {
    ...typography.caption,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
})
