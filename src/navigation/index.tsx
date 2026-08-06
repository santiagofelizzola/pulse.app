import { createNativeStackNavigator } from '@react-navigation/native-stack'

import CanvasScreen from '../screens/Canvas/CanvasScreen'
import LineupEditorScreen from '../screens/Lineups/LineupEditorScreen'
import AppNavigator from './AppNavigator'
import type { RootStackParamList } from './types'

const RootStack = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Main" component={AppNavigator} />
      <RootStack.Group screenOptions={{ presentation: 'fullScreenModal' }}>
        <RootStack.Screen name="Canvas" component={CanvasScreen} />
        <RootStack.Screen name="LineupEditor" component={LineupEditorScreen} />
      </RootStack.Group>
    </RootStack.Navigator>
  )
}
