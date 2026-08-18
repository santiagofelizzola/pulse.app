import { NavigationContainer } from '@react-navigation/native'
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins'
import * as SplashScreen from 'expo-splash-screen'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { getDatabase } from './src/db/database'
import { clearStaleExports } from './src/export/files'
import RootNavigator from './src/navigation'
import { navigationRef } from './src/navigation/rootNavigation'

SplashScreen.preventAutoHideAsync()

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  })
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    getDatabase()
    setDbReady(true)
    // Sweep any artifact left behind by a previous run. Deliberately not awaited — it is cache
    // housekeeping and must never delay first paint.
    void clearStaleExports()
  }, [])

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && dbReady) {
      await SplashScreen.hideAsync()
    }
  }, [fontsLoaded, dbReady])

  if (!fontsLoaded || !dbReady) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
          </NavigationContainer>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
