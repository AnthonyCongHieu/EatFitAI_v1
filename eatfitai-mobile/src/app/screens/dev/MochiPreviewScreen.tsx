import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '../../../components/ThemedText';
import SubScreenLayout from '../../../components/ui/SubScreenLayout';
import { useSmartReminders } from '../../../hooks/useSmartReminders';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { useGamificationStore } from '../../../store/useGamificationStore';
import { waterService, type WaterIntakeData } from '../../../services/waterService';
import { EN } from '../../../theme/emeraldNebula';
import { TEST_IDS } from '../../../testing/testIds';
import type { RootStackParamList } from '../../types';
import MochiRoomScene from '../../../features/mochi/MochiRoomScene';
import MochiRig from '../../../features/mochi/MochiRig';
import { MOCHI_VECTOR_TRACE_META } from '../../../features/mochi/mochiVectorTraceAssets';
import {
  getMochiCompanionState,
  type MochiAnimation,
  type MochiCompanionState,
  type MochiPrimaryAction,
} from '../../../features/mochi/mochiCompanionEngine';
import {
  getMochiPoseFromAnimation,
  MOCHI_POSE_CATALOG,
  MOCHI_POSE_ORDER,
  type MochiPoseKey,
  type MochiRendererMode,
} from '../../../features/mochi/mochiPoseCatalog';
import { MOCHI_ASSETS } from '../../../assets/mascot/mochi/mochiAssets';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ACTION_LABELS: Record<MochiPrimaryAction, string> = {
  scanFood: 'Quét món',
  addMeal: 'Ghi bữa',
  water: 'Uống nước',
  viewProgress: 'Xem thành tích',
};

const ACTION_ICONS: Record<MochiPrimaryAction, keyof typeof Ionicons.glyphMap> = {
  scanFood: 'scan-outline',
  addMeal: 'restaurant-outline',
  water: 'water-outline',
  viewProgress: 'trophy-outline',
};

const MODE_LABELS: Record<MochiRendererMode, string> = {
  vector: 'Vector',
  compare: 'So sánh',
  pngFallback: 'PNG',
};

const SIZE_OPTIONS = [48, 72, 128, 248] as const;

type MochiPreviewScreenProps = {
  uiOnly?: boolean;
};

const UI_ONLY_COMPANION_STATE: MochiCompanionState = {
  mood: 'thirsty',
  animation: 'drinkWater',
  dialogue: 'Bạn định chạy bằng Wi-Fi hả? Uống miếng nước đi, Mochi nhìn khát giùm rồi.',
  primaryAction: 'water',
  activeAccessoryIds: ['water_bottle'],
};

const getPoseAnimation = (pose: MochiPoseKey): MochiAnimation => {
  if (pose === 'drinkWater') return 'drinkWater';
  if (pose === 'reminder') return 'reminder';
  if (pose === 'thinking') return 'thinking';
  if (pose === 'surprised') return 'surprised';
  if (pose === 'hello') return 'wave';
  if (pose === 'goalComplete' || pose === 'excited') return 'celebrate';
  if (pose === 'happy' || pose === 'healthyFood' || pose === 'smartChoice') return 'happy';
  return 'idle';
};

const unlockCopy = (ids: string[]): string => {
  if (ids.length === 0) return 'Chưa mở phụ kiện';
  if (ids.includes('trophy')) return 'Cúp mục tiêu đã sẵn sàng';
  if (ids.includes('medal')) return 'Huy chương streak đã mở';
  if (ids.includes('water_bottle')) return 'Bình nước đang trực ca';
  return 'Mochi đã có đồ mới';
};

const MochiPreviewScreen = ({
  uiOnly = false,
}: MochiPreviewScreenProps): React.ReactElement => {
  const navigation = useNavigation<NavigationProp>();
  const { width: windowWidth } = useWindowDimensions();
  const [selectedPose, setSelectedPose] = useState<MochiPoseKey>(() =>
    uiOnly ? 'drinkWater' : 'idle',
  );
  const [rendererMode, setRendererMode] = useState<MochiRendererMode>(() =>
    uiOnly ? 'compare' : 'vector',
  );
  const [animationEnabled, setAnimationEnabled] = useState(() => !uiOnly);
  const [previewSize, setPreviewSize] = useState<(typeof SIZE_OPTIONS)[number]>(128);
  const summary = useDiaryStore((s) => s.summary);
  const fetchSummary = useDiaryStore((s) => s.fetchSummary);
  const { reminders } = useSmartReminders({ enabled: !uiOnly });
  const currentStreak = useGamificationStore((s) => s.currentStreak);
  const totalXP = useGamificationStore((s) => s.totalXP);
  const achievements = useGamificationStore((s) => s.achievements);
  const checkStreak = useGamificationStore((s) => s.checkStreak);
  const fetchWeeklyLogs = useGamificationStore((s) => s.fetchWeeklyLogs);

  const { data: waterData } = useQuery<WaterIntakeData>({
    queryKey: ['water-intake-today'],
    queryFn: () => waterService.getWaterIntake(new Date()),
    enabled: !uiOnly,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (uiOnly) {
      return;
    }

    fetchSummary().catch(() => undefined);
    checkStreak().catch(() => undefined);
    fetchWeeklyLogs().catch(() => undefined);
  }, [checkStreak, fetchSummary, fetchWeeklyLogs, uiOnly]);

  const liveCompanionState = useMemo(
    () =>
      getMochiCompanionState({
        reminders,
        totalCalories: summary?.totalCalories,
        targetCalories: summary?.targetCalories,
        waterAmountMl: waterData?.amountMl,
        waterTargetMl: waterData?.targetMl,
        currentStreak,
        totalXP,
        unlockedAchievementIds: achievements
          .filter((achievement) => Boolean(achievement.unlockedAt))
          .map((achievement) => achievement.id),
      }),
    [achievements, currentStreak, reminders, summary, totalXP, waterData],
  );
  const companionState = uiOnly ? UI_ONLY_COMPANION_STATE : liveCompanionState;
  const suggestedPose = getMochiPoseFromAnimation(companionState.animation);
  const selectedPoseMeta = MOCHI_POSE_CATALOG[selectedPose];
  const selectedPoseAnimation = getPoseAnimation(selectedPose);
  const selectedTraceMeta = MOCHI_VECTOR_TRACE_META[selectedPose];
  const traceSizeKb = Math.round(selectedTraceMeta.byteLength / 1024);
  const comparePreviewSize = Math.round(
    Math.min(180, Math.max(118, (windowWidth - 150) / 2)),
  );

  useEffect(() => {
    setSelectedPose(suggestedPose);
  }, [suggestedPose]);

  const runPrimaryAction = () => {
    if (companionState.primaryAction === 'scanFood') {
      navigation.navigate('AiCamera');
      return;
    }

    if (companionState.primaryAction === 'addMeal') {
      navigation.navigate('FoodSearch', {
        autoFocus: true,
        showQuickSuggestions: true,
        returnToDiaryOnSave: true,
      });
      return;
    }

    if (companionState.primaryAction === 'water') {
      navigation.navigate('AppTabs', {
        screen: 'HomeTab',
        params: {
          source: 'water-quick-action',
          focusWaterRequestId: Date.now(),
        },
      });
      return;
    }

    navigation.navigate('Achievements');
  };

  const accessoryNames = companionState.activeAccessoryIds.map((id) => {
    if (id === 'water_bottle') return 'Bình nước';
    if (id === 'streak_badge') return 'Huy hiệu streak';
    if (id === 'medal') return 'Huy chương';
    return 'Cúp mục tiêu';
  });

  return (
    <SubScreenLayout
      title="Phòng Mochi"
      subtitle="mascot vector sống động / cà khịa có kiểm soát"
      testID={TEST_IDS.profile.mochiPreviewScreen}
      contentContainerStyle={styles.content}
    >
      <Animated.View entering={FadeInDown.duration(260)} style={styles.hero}>
        <View style={styles.sceneShell}>
          {rendererMode === 'pngFallback' ? (
            <View style={styles.referenceStage}>
              <Image
                source={MOCHI_ASSETS[selectedPose]}
                resizeMode="contain"
                style={styles.referenceImage}
              />
            </View>
          ) : rendererMode === 'compare' ? (
            <View style={styles.compareStage}>
              <View style={styles.comparePane}>
                <MochiRig
                  expression={selectedPoseMeta.expression}
                  pose={selectedPose}
                  rendererMode="vector"
                  animated={animationEnabled}
                  activeAccessoryIds={companionState.activeAccessoryIds}
                  size={comparePreviewSize}
                />
              </View>
              <View style={styles.comparePane}>
                <Image
                  source={MOCHI_ASSETS[selectedPose]}
                  resizeMode="contain"
                  style={[
                    styles.compareReferenceImage,
                    { width: comparePreviewSize, height: comparePreviewSize },
                  ]}
                />
              </View>
            </View>
          ) : (
            <MochiRoomScene
              animation={selectedPoseAnimation}
              activeAccessoryIds={companionState.activeAccessoryIds}
              pose={selectedPose}
              rendererMode={rendererMode}
              animated={animationEnabled}
            />
          )}
        </View>

        <View style={styles.dialogueBubble}>
          <View style={styles.dialogueTail} />
          <ThemedText style={styles.dialogueLabel}>Mochi nói</ThemedText>
          <ThemedText style={styles.dialogueText}>
            {companionState.dialogue}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(80)} style={styles.actionPanel}>
        <View style={styles.actionCopy}>
          <ThemedText style={styles.panelTitle}>Mood hiện tại</ThemedText>
          <ThemedText style={styles.panelSubtitle}>
            {companionState.mood.replace(/_/g, ' ')} / {selectedPoseMeta.labelVi}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={runPrimaryAction}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={ACTION_ICONS[companionState.primaryAction]}
            size={18}
            color={EN.bg}
          />
          <ThemedText style={styles.primaryButtonText}>
            {ACTION_LABELS[companionState.primaryAction]}
          </ThemedText>
        </Pressable>
      </Animated.View>

      <View style={styles.qaPanel}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Pose QA</ThemedText>
          <ThemedText style={styles.sectionMeta}>
            {selectedPoseMeta.order}/24 · {selectedPoseMeta.animationPreset}
          </ThemedText>
        </View>

        <View style={styles.modeRow}>
          {(['vector', 'compare', 'pngFallback'] as MochiRendererMode[]).map((mode) => (
            <Pressable
              key={mode}
              accessibilityRole="button"
              onPress={() => setRendererMode(mode)}
              style={({ pressed }) => [
                styles.modeButton,
                rendererMode === mode && styles.modeButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                style={[
                  styles.modeButtonText,
                  rendererMode === mode && styles.modeButtonTextActive,
                ]}
              >
                {MODE_LABELS[mode]}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.sizeRow}>
          {SIZE_OPTIONS.map((sizeOption) => (
            <Pressable
              key={sizeOption}
              accessibilityRole="button"
              onPress={() => setPreviewSize(sizeOption)}
              style={({ pressed }) => [
                styles.sizeButton,
                previewSize === sizeOption && styles.sizeButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                style={[
                  styles.sizeButtonText,
                  previewSize === sizeOption && styles.sizeButtonTextActive,
                ]}
              >
                {sizeOption}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.traceInfoRow}>
          <ThemedText style={styles.traceInfoText}>
            SVG {selectedTraceMeta.width}×{selectedTraceMeta.height} · {selectedTraceMeta.pathCount} paths · {traceSizeKb} KB
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => setAnimationEnabled((current) => !current)}
            style={({ pressed }) => [
              styles.motionButton,
              animationEnabled && styles.motionButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              style={[
                styles.motionButtonText,
                animationEnabled && styles.motionButtonTextActive,
              ]}
            >
              Motion {animationEnabled ? 'On' : 'Off'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.sizePreview}>
          {rendererMode === 'pngFallback' ? (
            <Image
              source={MOCHI_ASSETS[selectedPose]}
              resizeMode="contain"
              style={{ width: previewSize, height: previewSize }}
            />
          ) : (
            <MochiRig
              expression={selectedPoseMeta.expression}
              pose={selectedPose}
              activeAccessoryIds={companionState.activeAccessoryIds}
              rendererMode={rendererMode}
              animated={animationEnabled}
              size={previewSize}
              testID="mochi-preview-size-rig"
            />
          )}
          <View style={styles.sizeCopy}>
            <ThemedText style={styles.poseName}>{selectedPoseMeta.labelVi}</ThemedText>
            <ThemedText style={styles.poseMeta}>
              {selectedPose} · {rendererMode} · motion {animationEnabled ? 'on' : 'off'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.poseGrid}>
          {MOCHI_POSE_ORDER.map((poseKey) => {
            const poseMeta = MOCHI_POSE_CATALOG[poseKey];
            const isSelected = poseKey === selectedPose;

            return (
              <Pressable
                key={poseKey}
                accessibilityRole="button"
                onPress={() => setSelectedPose(poseKey)}
                style={({ pressed }) => [
                  styles.poseTile,
                  isSelected && styles.poseTileActive,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.poseOrder}>
                  {poseMeta.order.toString().padStart(2, '0')}
                </ThemedText>
                <ThemedText
                  numberOfLines={2}
                  style={[styles.poseTileLabel, isSelected && styles.poseTileLabelActive]}
                >
                  {poseMeta.labelVi}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Cosmetic unlocks</ThemedText>
        <ThemedText style={styles.sectionMeta}>
          {companionState.activeAccessoryIds.length}/4
        </ThemedText>
      </View>

      <View style={styles.unlockPanel}>
        <View style={styles.unlockIcon}>
          <Ionicons name="sparkles-outline" size={21} color="#F5C280" />
        </View>
        <View style={styles.unlockCopy}>
          <ThemedText style={styles.unlockTitle}>
            {unlockCopy(companionState.activeAccessoryIds)}
          </ThemedText>
          <ThemedText style={styles.unlockSubtitle}>
            {accessoryNames.length > 0
              ? accessoryNames.join(', ')
              : 'Log bữa, uống nước và giữ streak để Mochi có đồ mới.'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.quickGrid}>
        {([
          ['scanFood', 'scan-outline'],
          ['addMeal', 'restaurant-outline'],
          ['water', 'water-outline'],
          ['viewProgress', 'trophy-outline'],
        ] as const).map(([action, icon]) => (
          <Pressable
            key={action}
            accessibilityRole="button"
            onPress={() => {
              if (action === 'scanFood') navigation.navigate('AiCamera');
              if (action === 'addMeal') {
                navigation.navigate('FoodSearch', {
                  autoFocus: true,
                  showQuickSuggestions: true,
                  returnToDiaryOnSave: true,
                });
              }
              if (action === 'water') {
                navigation.navigate('AppTabs', {
                  screen: 'HomeTab',
                  params: {
                    source: 'water-quick-action',
                    focusWaterRequestId: Date.now(),
                  },
                });
              }
              if (action === 'viewProgress') navigation.navigate('Achievements');
            }}
            style={({ pressed }) => [
              styles.quickAction,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name={icon} size={20} color={EN.primary} />
            <ThemedText style={styles.quickText}>
              {ACTION_LABELS[action]}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </SubScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 18,
  },
  hero: {
    gap: 14,
  },
  sceneShell: {
    minHeight: 330,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#141824',
    borderWidth: 1,
    borderColor: 'rgba(245, 194, 128, 0.22)',
  },
  referenceStage: {
    minHeight: 330,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF6E7',
  },
  referenceImage: {
    width: '100%',
    height: '100%',
    minHeight: 260,
  },
  compareReferenceImage: {
    maxWidth: '100%',
    maxHeight: '100%',
  },
  compareStage: {
    minHeight: 330,
    flexDirection: 'row',
    backgroundColor: '#FFF6E7',
  },
  comparePane: {
    flex: 1,
    minHeight: 330,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: 'rgba(43, 22, 11, 0.16)',
  },
  dialogueBubble: {
    borderRadius: 18,
    backgroundColor: '#FFF6E7',
    borderWidth: 1,
    borderColor: 'rgba(245, 194, 128, 0.55)',
    padding: 15,
    position: 'relative',
  },
  dialogueTail: {
    position: 'absolute',
    top: -8,
    left: 34,
    width: 16,
    height: 16,
    backgroundColor: '#FFF6E7',
    transform: [{ rotate: '45deg' }],
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(245, 194, 128, 0.55)',
  },
  dialogueLabel: {
    color: '#7C4A20',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  dialogueText: {
    color: '#3F2A17',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  actionPanel: {
    borderRadius: 18,
    backgroundColor: EN.surfaceLow,
    borderWidth: 1,
    borderColor: EN.outline,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionCopy: {
    flex: 1,
    gap: 4,
  },
  panelTitle: {
    color: EN.onSurface,
    fontSize: 15,
    fontWeight: '900',
  },
  panelSubtitle: {
    color: EN.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: EN.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: EN.bg,
    fontSize: 13,
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: EN.onSurface,
    fontSize: 16,
    fontWeight: '900',
  },
  sectionMeta: {
    color: EN.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  unlockPanel: {
    borderRadius: 18,
    backgroundColor: '#171A22',
    borderWidth: 1,
    borderColor: 'rgba(245, 194, 128, 0.2)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unlockIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 194, 128, 0.12)',
  },
  unlockCopy: {
    flex: 1,
    gap: 4,
  },
  unlockTitle: {
    color: '#FFF6E7',
    fontSize: 14,
    fontWeight: '900',
  },
  unlockSubtitle: {
    color: '#D9C7AE',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: '47%',
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: EN.surfaceLow,
    borderWidth: 1,
    borderColor: EN.outline,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  quickText: {
    flex: 1,
    color: EN.onSurface,
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  qaPanel: {
    borderRadius: 18,
    backgroundColor: EN.surfaceLow,
    borderWidth: 1,
    borderColor: EN.outline,
    padding: 14,
    gap: 14,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171A22',
    borderWidth: 1,
    borderColor: 'rgba(245, 194, 128, 0.16)',
  },
  modeButtonActive: {
    backgroundColor: EN.primary,
    borderColor: EN.primary,
  },
  modeButtonText: {
    color: '#D9C7AE',
    fontSize: 12,
    fontWeight: '900',
  },
  modeButtonTextActive: {
    color: EN.bg,
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  traceInfoRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  traceInfoText: {
    flex: 1,
    color: '#D9C7AE',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  motionButton: {
    minHeight: 34,
    minWidth: 96,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171A22',
    borderWidth: 1,
    borderColor: 'rgba(245, 194, 128, 0.16)',
    paddingHorizontal: 10,
  },
  motionButtonActive: {
    backgroundColor: EN.primary,
    borderColor: EN.primary,
  },
  motionButtonText: {
    color: '#D9C7AE',
    fontSize: 11,
    fontWeight: '900',
  },
  motionButtonTextActive: {
    color: EN.bg,
  },
  sizeButton: {
    width: 56,
    minHeight: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171A22',
    borderWidth: 1,
    borderColor: 'rgba(245, 194, 128, 0.16)',
  },
  sizeButtonActive: {
    backgroundColor: '#FFF6E7',
    borderColor: '#F5C280',
  },
  sizeButtonText: {
    color: '#D9C7AE',
    fontSize: 12,
    fontWeight: '900',
  },
  sizeButtonTextActive: {
    color: '#3F2A17',
  },
  sizePreview: {
    minHeight: 112,
    borderRadius: 14,
    backgroundColor: '#171A22',
    borderWidth: 1,
    borderColor: 'rgba(245, 194, 128, 0.16)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sizeCopy: {
    flex: 1,
    gap: 4,
  },
  poseName: {
    color: '#FFF6E7',
    fontSize: 15,
    fontWeight: '900',
  },
  poseMeta: {
    color: '#D9C7AE',
    fontSize: 12,
    fontWeight: '700',
  },
  poseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  poseTile: {
    width: '31.8%',
    minHeight: 58,
    borderRadius: 12,
    backgroundColor: '#171A22',
    borderWidth: 1,
    borderColor: 'rgba(245, 194, 128, 0.16)',
    padding: 9,
    gap: 4,
  },
  poseTileActive: {
    backgroundColor: '#FFF6E7',
    borderColor: '#F5C280',
  },
  poseOrder: {
    color: '#F5C280',
    fontSize: 11,
    fontWeight: '900',
  },
  poseTileLabel: {
    color: '#FFF6E7',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  poseTileLabelActive: {
    color: '#3F2A17',
  },
});

export default MochiPreviewScreen;
