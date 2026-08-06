import { createNavigationContainerRef } from '@react-navigation/native'

import type { RootStackParamList } from './types'

// Lets any screen open a root-level modal (Canvas, LineupEditor) without
// prop-drilling navigation objects through nested tab/stack navigators.
// Pattern: https://reactnavigation.org/docs/navigating-without-navigation-prop/
export const navigationRef = createNavigationContainerRef<RootStackParamList>()

export function navigate<RouteName extends keyof RootStackParamList>(
  ...args: RouteName extends unknown
    ? undefined extends RootStackParamList[RouteName]
      ? [screen: RouteName] | [screen: RouteName, params: RootStackParamList[RouteName]]
      : [screen: RouteName, params: RootStackParamList[RouteName]]
    : never
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(...args)
  }
}
