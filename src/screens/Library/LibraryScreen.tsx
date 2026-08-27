import { useCallback, useMemo, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { HeaderActionButton, ScreenHeader } from '../../components/ui/ScreenHeader'
import { SegmentedToggle } from '../../components/ui/SegmentedToggle'
import { usePressAnimation } from '../../components/ui/usePressAnimation'
import { activityRepository } from '../../db/repositories/activityRepository'
import { sessionRepository } from '../../db/repositories/sessionRepository'
import { navigate } from '../../navigation/rootNavigation'
import type { LibraryStackParamList } from '../../navigation/types'
import { colors, layout, radius, spacing, typography } from '../../theme/theme'
import type { Activity, ActivityTag, Session } from '../../types'
import { ActivityCard } from './components/ActivityCard'
import { FilterChipRow } from './components/FilterChipRow'
import { SessionListItem } from './components/SessionListItem'

type LibraryView = 'drills' | 'sessions'

const VIEW_OPTIONS: Array<{ value: LibraryView; label: string }> = [
  { value: 'drills', label: 'Drills' },
  { value: 'sessions', label: 'Sessions' },
]

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export default function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>()
  const [view, setView] = useState<LibraryView>('drills')
  const [activities, setActivities] = useState<Activity[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedTag, setSelectedTag] = useState<ActivityTag | undefined>(undefined)

  useFocusEffect(
    useCallback(() => {
      activityRepository.list().then(setActivities)
      sessionRepository.list().then(setSessions)
    }, [])
  )

  const filteredActivities = useMemo(
    () => (selectedTag ? activities.filter((activity) => activity.tag === selectedTag) : activities),
    [activities, selectedTag]
  )

  const handleDeleteSession = useCallback((session: Session) => {
    Alert.alert('Delete session?', `"${session.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await sessionRepository.delete(session.id)
          setSessions(await sessionRepository.list())
        },
      },
    ])
  }, [])

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Library"
        trailing={
          view === 'sessions' ? (
            <HeaderActionButton label="+" onPress={() => navigation.navigate('SessionBuilder')} />
          ) : undefined
        }
      />

      <View style={styles.toggleRow}>
        <SegmentedToggle options={VIEW_OPTIONS} value={view} onChange={setView} />
      </View>

      {view === 'drills' ? (
        <DrillsView
          activities={activities}
          filteredActivities={filteredActivities}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          onOpenActivity={(activityId) => navigation.navigate('ActivityDetail', { activityId })}
        />
      ) : (
        <SessionsView
          sessions={sessions}
          onOpenSession={(sessionId) => navigation.navigate('SessionBuilder', { sessionId })}
          onNewSession={() => navigation.navigate('SessionBuilder')}
          onDeleteSession={handleDeleteSession}
        />
      )}
    </SafeAreaView>
  )
}

interface DrillsViewProps {
  activities: Activity[]
  filteredActivities: Activity[]
  selectedTag: ActivityTag | undefined
  onSelectTag: (tag: ActivityTag | undefined) => void
  onOpenActivity: (activityId: string) => void
}

function DrillsView({ activities, filteredActivities, selectedTag, onSelectTag, onOpenActivity }: DrillsViewProps) {
  // Called before the early return below — the empty state is conditional, the hook must not be.
  const cta = usePressAnimation()

  if (activities.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.headline}>No activities yet</Text>
        <Text style={styles.supporting}>Save a drill from the canvas to start your library.</Text>
        <AnimatedPressable
          style={[styles.cta, cta.animatedStyle]}
          onPress={() => navigate('Canvas')}
          onPressIn={cta.onPressIn}
          onPressOut={cta.onPressOut}
        >
          <Text style={styles.ctaLabel}>Open canvas</Text>
        </AnimatedPressable>
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <View style={styles.chipRow}>
        <FilterChipRow selected={selectedTag} onSelect={onSelectTag} />
      </View>
      {filteredActivities.length === 0 ? (
        <Text style={styles.noMatches}>No drills match this filter.</Text>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => <ActivityCard activity={item} onPress={() => onOpenActivity(item.id)} />}
        />
      )}
    </View>
  )
}

interface SessionsViewProps {
  sessions: Session[]
  onOpenSession: (sessionId: string) => void
  onNewSession: () => void
  onDeleteSession: (session: Session) => void
}

function SessionsView({ sessions, onOpenSession, onNewSession, onDeleteSession }: SessionsViewProps) {
  // Called before the early return below — the empty state is conditional, the hook must not be.
  const cta = usePressAnimation()

  if (sessions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.headline}>No sessions planned</Text>
        <Text style={styles.supporting}>Build a session from your saved activities.</Text>
        <AnimatedPressable
          style={[styles.cta, cta.animatedStyle]}
          onPress={onNewSession}
          onPressIn={cta.onPressIn}
          onPressOut={cta.onPressOut}
        >
          <Text style={styles.ctaLabel}>New session</Text>
        </AnimatedPressable>
      </View>
    )
  }

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <SessionListItem session={item} onPress={() => onOpenSession(item.id)} onDelete={() => onDeleteSession(item)} />
      )}
    />
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  toggleRow: {
    paddingHorizontal: layout.screenPaddingX,
    marginBottom: spacing.lg,
  },
  chipRow: {
    marginBottom: spacing.lg,
  },
  noMatches: {
    ...typography.callout,
    color: colors.textSecondary,
    paddingHorizontal: layout.screenPaddingX,
  },
  grid: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  gridRow: {
    gap: spacing.lg,
  },
  list: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.xl,
    gap: spacing.md,
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
