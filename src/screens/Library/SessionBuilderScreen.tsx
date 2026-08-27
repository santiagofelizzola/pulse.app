import { useCallback, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ChevronLeft, Info, Share2 } from 'lucide-react-native'
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { useSharedValue } from 'react-native-reanimated'

import { ExportSheet } from '../../components/ui/ExportSheet'
import { HeaderActionButton } from '../../components/ui/ScreenHeader'
import { usePressAnimation } from '../../components/ui/usePressAnimation'
import { useShareExport } from '../../export/useShareExport'
import { sessionRepository } from '../../db/repositories/sessionRepository'
import type { LibraryStackParamList } from '../../navigation/types'
import { colors, layout, radius, spacing, typography } from '../../theme/theme'
import {
  exportSession,
  shouldWarnBeforeSessionExport,
  type ExportDetail,
} from '../../utils/exportUtils'
import type { Activity, BlockType, Session, SessionActivity } from '../../types'
import { ActivityPickerSheet } from './components/ActivityPickerSheet'
import { BlockTypePicker } from './components/BlockTypePicker'
import { CoachingPointsEditor } from './components/CoachingPointsEditor'
import { DurationEditor } from './components/DurationEditor'
import { SessionBlockCard, SESSION_CARD_GAP } from './components/SessionBlockCard'
import { SessionDetailsSheet } from './components/SessionDetailsSheet'

// The one subject where two templates are genuinely two different documents rather than the same
// artifact with more fields: an overview to scan, or a plan to coach from.
const SESSION_EXPORT_DETAIL_OPTIONS: Array<{ value: ExportDetail; label: string }> = [
  { value: 'simple', label: 'Overview' },
  { value: 'full', label: 'Full plan' },
]

type Route = RouteProp<LibraryStackParamList, 'SessionBuilder'>

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export default function SessionBuilderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>()
  const { params } = useRoute<Route>()
  const sessionId = params?.sessionId

  const [session, setSession] = useState<Session | null>(null)
  const [name, setName] = useState('')
  const [focus, setFocus] = useState('')
  const [sessionPlayerCount, setSessionPlayerCount] = useState<number | undefined>(undefined)
  const [coachingMoments, setCoachingMoments] = useState('')
  const [blocks, setBlocks] = useState<SessionActivity[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [blockTypeTarget, setBlockTypeTarget] = useState<SessionActivity | null>(null)
  const [coachingPointsTarget, setCoachingPointsTarget] = useState<SessionActivity | null>(null)
  const [durationTarget, setDurationTarget] = useState<SessionActivity | null>(null)
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false)
  const [exportSheetOpen, setExportSheetOpen] = useState(false)
  const [exportDetail, setExportDetail] = useState<ExportDetail>('full')
  const { busy: exporting, share } = useShareExport()

  const activeIndex = useSharedValue(-1)
  const dragY = useSharedValue(0)

  const backPress = usePressAnimation()
  const detailsPress = usePressAnimation()
  const sharePress = usePressAnimation()
  const emptyCtaPress = usePressAnimation()

  // Only load once per screen instance — the session is created lazily by this same screen's
  // own actions, so re-running on every focus would clobber in-progress local edits.
  useFocusEffect(
    useCallback(() => {
      if (!sessionId) return
      sessionRepository.getById(sessionId).then((loaded) => {
        if (!loaded) return
        setSession(loaded)
        setName(loaded.name)
        setFocus(loaded.focus ?? '')
        setSessionPlayerCount(loaded.playerCount)
        setCoachingMoments(loaded.coachingMoments ?? '')
        setBlocks(loaded.activities)
      })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  )

  async function refresh(id: string) {
    const updated = await sessionRepository.getById(id)
    setSession(updated)
    setBlocks(updated?.activities ?? [])
  }

  // A session row is only created once it has something worth keeping — its first activity —
  // so backing out of an empty builder never leaves a junk row behind.
  async function ensureSession(): Promise<Session> {
    if (session) return session
    const created = await sessionRepository.create({
      name: name.trim() || 'Untitled session',
      focus: focus.trim() || undefined,
      playerCount: sessionPlayerCount,
      coachingMoments: coachingMoments.trim() || undefined,
    })
    setSession(created)
    return created
  }

  function handleNameChange(value: string) {
    setName(value)
    if (session) {
      sessionRepository.update(session.id, { name: value.trim() || 'Untitled session' })
    }
  }

  async function handleSaveSessionDetails(patch: { focus?: string; playerCount?: number; coachingMoments?: string }) {
    setFocus(patch.focus ?? '')
    setSessionPlayerCount(patch.playerCount)
    setCoachingMoments(patch.coachingMoments ?? '')
    if (session) {
      await sessionRepository.update(session.id, patch)
    }
  }

  async function handleSelectActivities(selected: Activity[]) {
    setPickerOpen(false)
    if (selected.length === 0) return
    const current = await ensureSession()
    // First block in the session defaults to warm-up, everything else (including the rest of
    // this same batch) defaults to technical — sequential awaits keep each addActivity's
    // MAX(position)+1 lookup race-free.
    let hasBlocks = blocks.length > 0
    for (const activity of selected) {
      const blockType: BlockType = hasBlocks ? 'technical' : 'warm-up'
      await sessionRepository.addActivity(current.id, { activityId: activity.id, blockType })
      hasBlocks = true
    }
    await refresh(current.id)
  }

  async function handleRemoveBlock(block: SessionActivity) {
    if (!session) return
    await sessionRepository.removeActivity(session.id, block.id)
    await refresh(session.id)
  }

  async function handleChangeBlockType(block: SessionActivity, blockType: BlockType) {
    if (!session) return
    await sessionRepository.updateActivity(session.id, block.id, { blockType })
    await refresh(session.id)
  }

  async function handleSaveCoachingPoints(block: SessionActivity, coachingPoints: string) {
    if (!session) return
    await sessionRepository.updateActivity(session.id, block.id, { coachingPoints })
    await refresh(session.id)
  }

  async function handleSaveDuration(block: SessionActivity, minutes: number | undefined) {
    if (!session) return
    await sessionRepository.updateActivity(session.id, block.id, { durationOverride: minutes ?? null })
    await refresh(session.id)
  }

  function handleDragStart() {
    setExpandedIds(new Set())
  }

  function handleDragEnd(id: string, deltaIndex: number) {
    if (!session || deltaIndex === 0) return
    setBlocks((prev) => {
      const fromIndex = prev.findIndex((b) => b.id === id)
      if (fromIndex === -1) return prev
      const toIndex = Math.max(0, Math.min(prev.length - 1, fromIndex + deltaIndex))
      if (toIndex === fromIndex) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      sessionRepository.reorderActivities(session.id, next.map((b) => b.id))
      return next
    })
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleRemoveConfirm(block: SessionActivity) {
    Alert.alert('Remove activity?', `"${block.activity.name}" will be removed from this session.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => handleRemoveBlock(block) },
    ])
  }

  const totalDuration = session?.totalDurationMinutes ?? 0

  // Composed from LIVE screen state rather than the last-loaded row: name, focus and block order
  // are edited locally and persisted asynchronously, so the record can lag by a beat. The export
  // should be the session the coach is looking at.
  const sessionForExport: Session | null = session
    ? {
        ...session,
        name: name.trim() || 'Untitled session',
        focus: focus.trim() || undefined,
        playerCount: sessionPlayerCount,
        coachingMoments: coachingMoments.trim() || undefined,
        activities: blocks,
      }
    : null

  function handleShare() {
    if (!sessionForExport) return
    const run = () =>
      share(
        () => setExportSheetOpen(false),
        () => exportSession(sessionForExport, { detail: exportDetail })
      )

    // Every activity costs a full-size capture, so a very long session is slow enough to be
    // worth confirming rather than appearing to hang.
    if (shouldWarnBeforeSessionExport(sessionForExport)) {
      Alert.alert(
        'Long session',
        `This session has ${blocks.length} activities and will take a moment to render.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Export', onPress: () => void run() },
        ]
      )
      return
    }
    void run()
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <AnimatedPressable
            onPress={() => navigation.goBack()}
            onPressIn={backPress.onPressIn}
            onPressOut={backPress.onPressOut}
            hitSlop={layout.hitSlop}
            style={[styles.backButton, backPress.animatedStyle]}
          >
            <ChevronLeft size={24} color={colors.primary} />
          </AnimatedPressable>
          <TextInput
            value={name}
            onChangeText={handleNameChange}
            placeholder="Untitled session"
            placeholderTextColor={colors.textTertiary}
            style={styles.nameInput}
          />
          <AnimatedPressable
            onPress={() => setDetailsSheetOpen(true)}
            onPressIn={detailsPress.onPressIn}
            onPressOut={detailsPress.onPressOut}
            hitSlop={layout.hitSlop}
            style={[styles.detailsButton, detailsPress.animatedStyle]}
          >
            <Info size={22} color={colors.textPrimary} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => setExportSheetOpen(true)}
            onPressIn={sharePress.onPressIn}
            onPressOut={sharePress.onPressOut}
            disabled={blocks.length === 0}
            hitSlop={layout.hitSlop}
            style={[styles.detailsButton, sharePress.animatedStyle]}
          >
            <Share2 size={22} color={blocks.length === 0 ? colors.textDisabled : colors.textPrimary} />
          </AnimatedPressable>
          <HeaderActionButton label="+" onPress={() => setPickerOpen(true)} />
        </View>
        <Text style={styles.subtitle}>
          {totalDuration} min · {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
        </Text>
      </View>

      {blocks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyHeadline}>Empty session</Text>
          <Text style={styles.emptySupporting}>Tap + to add your first activity from the library.</Text>
          <AnimatedPressable
            style={[styles.emptyCta, emptyCtaPress.animatedStyle]}
            onPress={() => setPickerOpen(true)}
            onPressIn={emptyCtaPress.onPressIn}
            onPressOut={emptyCtaPress.onPressOut}
          >
            <Text style={styles.emptyCtaLabel}>Add activity</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {blocks.map((block, index) => (
            <SessionBlockCard
              key={block.id}
              block={block}
              index={index}
              blocksCount={blocks.length}
              activeIndex={activeIndex}
              dragY={dragY}
              isExpanded={expandedIds.has(block.id)}
              onToggleExpand={() => toggleExpand(block.id)}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onOpenBlockTypePicker={() => setBlockTypeTarget(block)}
              onOpenCoachingPointsEditor={() => setCoachingPointsTarget(block)}
              onOpenDurationEditor={() => setDurationTarget(block)}
              onRemove={() => handleRemoveConfirm(block)}
            />
          ))}
        </ScrollView>
      )}

      <ActivityPickerSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleSelectActivities} />

      <BlockTypePicker
        visible={blockTypeTarget !== null}
        selected={blockTypeTarget?.blockType}
        onSelect={(type) => {
          if (blockTypeTarget) handleChangeBlockType(blockTypeTarget, type)
        }}
        onClose={() => setBlockTypeTarget(null)}
      />

      <CoachingPointsEditor
        visible={coachingPointsTarget !== null}
        initialValue={coachingPointsTarget?.coachingPoints ?? ''}
        onClose={() => setCoachingPointsTarget(null)}
        onSave={(value) => {
          if (coachingPointsTarget) handleSaveCoachingPoints(coachingPointsTarget, value)
        }}
      />

      <DurationEditor
        visible={durationTarget !== null}
        initialValue={durationTarget?.durationOverride}
        onClose={() => setDurationTarget(null)}
        onSave={(minutes) => {
          if (durationTarget) handleSaveDuration(durationTarget, minutes)
        }}
      />

      <ExportSheet
        visible={exportSheetOpen}
        detail={exportDetail}
        detailOptions={SESSION_EXPORT_DETAIL_OPTIONS}
        hint={
          exportDetail === 'full'
            ? 'A PDF: a cover page, then one page per activity with its coaching points.'
            : 'A PDF: two activities per page, for scanning the session at a glance.'
        }
        busy={exporting}
        error={null}
        onChangeDetail={setExportDetail}
        onShare={handleShare}
        onClose={() => setExportSheetOpen(false)}
      />

      <SessionDetailsSheet
        visible={detailsSheetOpen}
        initialFocus={focus}
        initialPlayerCount={sessionPlayerCount}
        initialCoachingMoments={coachingMoments}
        onClose={() => setDetailsSheetOpen(false)}
        onSave={handleSaveSessionDetails}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.touchTarget,
  },
  backButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -layout.hitSlop,
  },
  detailsButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    ...typography.h1,
    color: colors.textPrimary,
    flex: 1,
    padding: 0,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  list: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.xxl,
    gap: SESSION_CARD_GAP,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxxl,
  },
  emptyHeadline: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySupporting: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.xl,
  },
  emptyCta: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaLabel: {
    ...typography.label,
    color: colors.primary,
  },
})
