import type { NavigatorScreenParams } from '@react-navigation/native'

export type LibraryStackParamList = {
  LibraryHome: undefined
  SessionBuilder: { sessionId?: string } | undefined
  ActivityDetail: { activityId: string }
}

export type LineupsStackParamList = {
  LineupsHome: undefined
}

export type TabParamList = {
  Training: undefined // no screen — tabPress is intercepted to open the Canvas modal
  Library: NavigatorScreenParams<LibraryStackParamList>
  Lineups: NavigatorScreenParams<LineupsStackParamList>
}

export type RootStackParamList = {
  Main: NavigatorScreenParams<TabParamList>
  Canvas: undefined
  LineupEditor: { lineupId?: string } | undefined
}

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
