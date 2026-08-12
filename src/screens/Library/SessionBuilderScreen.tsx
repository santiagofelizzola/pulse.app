import { useCallback, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ChevronLeft } from 'lucide-react-native'
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'

import { HeaderActionButton } from '../../components/ui/ScreenHeader'
import { sessionRepository } from '../../db/repositories/sessionRepository'
import type { LibraryStackParamList } from '../../navigation/types'
import { colors, layout, radius, spacing, typography } from '../../theme/theme'
import type { Activity, BlockType, Session, SessionActivity } from '../../types'
import { ActivityPickerSheet } from './components/ActivityPickerSheet'
import { BlockTypePicker } from './components/BlockTypePicker'
import { CoachingPointsEditor } from './components/CoachingPointsEditor'
import { DurationEditor } from './components/DurationEditor'
import { SessionBlockCard, SESSION_CARD_GAP } from './components/SessionBlockCard'

type Route = RouteProp<LibraryStackParamList, 'SessionBuilder'>

export default function SessionBuilderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LibraryStackParamList>>()
  const { params } = useRoute<Route>()
  const sessionId = params?.sessionId

  const [session, setSession] = useState<Session | null>(null)
  const [name, setName] = useState('')
  const [blocks, setBlocks] = useState<SessionActivity[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [blockTypeTarget, setBlockTypeTarget] = useState<SessionActivity | null>(null)
  const [coachingPointsTarget, setCoachingPointsTarget] = useState<SessionActivity | null>(null)
  const [durationTarget, setDurationTarget] = useState<SessionActivity | null>(null)

  const activeIndex = useSharedValue(-1)
  const dragY = useSharedValue(0)

  // Only load once per screen instance — the session is created lazily by this same screen's
  // own actions, so re-running on every focus would clobber in-progress local edits.
  useFocusEffect(
    useCallback(() => {
      if (!sessionId) return
      sessionRepository.getById(sessionId).then((loaded) => {
        if (!loaded) return
        setSession(loaded)
        setName(loaded.name)
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
    const created = await sessionRepository.create({ name: name.trim() || 'Untitled session' })
    setSession(created)
    return created
  }

  function handleNameChange(value: string) {
    setName(value)
    if (session) {
      sessionRepository.update(session.id, { name: value.trim() || 'Untitled session' })
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={layout.hitSlop} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.primary} />
          </Pressable>
          <TextInput
            value={name}
            onChangeText={handleNameChange}
            placeholder="Untitled session"
            placeholderTextColor={colors.textTertiary}
            style={styles.nameInput}
          />
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
          <Pressable style={styles.emptyCta} onPress={() => setPickerOpen(true)}>
            <Text style={styles.emptyCtaLabel}>Add activity</Text>
          </Pressable>
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
