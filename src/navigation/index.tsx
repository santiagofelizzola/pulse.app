import { Fragment } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { ExportRenderHost } from '../export/ExportRenderHost'
import CanvasScreen from '../screens/Canvas/CanvasScreen'
import LineupEditorScreen from '../screens/Lineups/LineupEditorScreen'
import AppNavigator from './AppNavigator'
import type { RootStackParamList } from './types'

const RootStack = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  return (
    <Fragment>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={AppNavigator} />
        <RootStack.Group screenOptions={{ presentation: 'fullScreenModal' }}>
          <RootStack.Screen name="Canvas" component={CanvasScreen} />
          <RootStack.Screen name="LineupEditor" component={LineupEditorScreen} />
        </RootStack.Group>
      </RootStack.Navigator>

      {/* Sits OUTSIDE the navigator, as a sibling: an export must be able to render and capture
          an artifact without unmounting, re-laying-out or scrolling whatever screen the coach
          started it from. It renders nothing at all until a job is enqueued. */}
      <ExportRenderHost />
    </Fragment>
  )
}
