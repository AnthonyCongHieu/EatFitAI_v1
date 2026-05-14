import React, { useEffect, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
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
import {
  getMochiCompanionState,
  type MochiPrimaryAction,
} from '../../../features/mochi/mochiCompanionEngine';

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

const unlockCopy = (ids: string[]): string => {
  if (ids.length === 0) return 'Chưa mở phụ kiện';
  if (ids.includes('trophy')) return 'Cúp mục tiêu đã sẵn sàng';
  if (ids.includes('medal')) return 'Huy chương streak đã mở';
  if (ids.includes('water_bottle')) return 'Bình nước đang trực ca';
  return 'Mochi đã có đồ mới';
};

const MochiPreviewScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp>();
  const summary = useDiaryStore((s) => s.summary);
  const fetchSummary = useDiaryStore((s) => s.fetchSummary);
  const { reminders } = useSmartReminders();
  const currentStreak = useGamificationStore((s) => s.currentStreak);
  const totalXP = useGamificationStore((s) => s.totalXP);
  const achievements = useGamificationStore((s) => s.achievements);
  const checkStreak = useGamificationStore((s) => s.checkStreak);
  const fetchWeeklyLogs = useGamificationStore((s) => s.fetchWeeklyLogs);

  const { data: waterData } = useQuery<WaterIntakeData>({
    queryKey: ['water-intake-today'],
    queryFn: () => waterService.getWaterIntake(new Date()),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    fetchSummary().catch(() => undefined);
    checkStreak().catch(() => undefined);
    fetchWeeklyLogs().catch(() => undefined);
  }, [checkStreak, fetchSummary, fetchWeeklyLogs]);

  const companionState = useMemo(
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
          <MochiRoomScene
            animation={companionState.animation}
            activeAccessoryIds={companionState.activeAccessoryIds}
          />
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
            {companionState.mood.replace(/_/g, ' ')} / {companionState.animation}
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
});

export default MochiPreviewScreen;
