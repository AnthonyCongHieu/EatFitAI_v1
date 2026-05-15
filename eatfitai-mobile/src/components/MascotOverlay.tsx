import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import QuickActionsOverlay from './home/QuickActionsOverlay';
import MascotCharacter, { type MascotState } from './MascotCharacter';
import { TEST_IDS } from '../testing/testIds';
import { useSmartReminders } from '../hooks/useSmartReminders';
import { useDiaryStore } from '../store/useDiaryStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { waterService, type WaterIntakeData } from '../services/waterService';
import { ThemedText } from './ThemedText';
import { getMoChiPetState, type MoChiPrimaryAction } from '../features/mochi/mochiPetEngine';

const PET_MOOD_TO_STATE: Record<string, MascotState> = {
  idle: 'idle',
  happy: 'success',
  hungry: 'hungry',
  thirsty: 'thirsty',
  thinking: 'thinking',
  confused: 'confused',
  concerned: 'concerned',
  error: 'error',
  celebrating: 'celebrating',
  reporting: 'reporting',
};

const MascotOverlay = (): React.ReactElement => {
  const navigation = useNavigation<any>();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [dismissedEvent, setDismissedEvent] = useState<string | null>(null);
  const { reminders, hasReminders } = useSmartReminders();
  const summary = useDiaryStore((s) => s.summary);
  const currentStreak = useGamificationStore((s) => s.currentStreak);
  const totalXP = useGamificationStore((s) => s.totalXP);
  const achievements = useGamificationStore((s) => s.achievements);

  const { data: waterData } = useQuery<WaterIntakeData>({
    queryKey: ['water-intake-today'],
    queryFn: () => waterService.getWaterIntake(new Date()),
    staleTime: 2 * 60 * 1000,
  });

  const petState = useMemo(
    () =>
      getMoChiPetState({
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

  const shouldBubble = petState.shouldBubble && dismissedEvent !== petState.eventType;
  const mascotState = PET_MOOD_TO_STATE[petState.mood] ?? 'idle';

  const floatAnim = useSharedValue(0);
  const mascotOffsetX = useSharedValue(0);
  const mascotOffsetY = useSharedValue(0);
  const mascotSavedX = useSharedValue(0);
  const mascotSavedY = useSharedValue(0);
  const bubbleBounce = useSharedValue(0);

  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [floatAnim]);

  useEffect(() => {
    if (!shouldBubble) {
      bubbleBounce.value = 0;
      return;
    }

    bubbleBounce.value = withRepeat(
      withSequence(
        withDelay(
          8000,
          withTiming(-2, { duration: 180, easing: Easing.out(Easing.ease) }),
        ),
        withTiming(0, { duration: 180, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );

    return () => {
      bubbleBounce.value = 0;
    };
  }, [bubbleBounce, shouldBubble]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: mascotOffsetX.value },
      { translateY: floatAnim.value + mascotOffsetY.value },
    ],
  }));

  const bubbleBounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bubbleBounce.value }],
  }));

  const mascotPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((e) => {
          mascotOffsetX.value = mascotSavedX.value + e.translationX;
          mascotOffsetY.value = mascotSavedY.value + e.translationY;
        })
        .onEnd(() => {
          mascotSavedX.value = mascotOffsetX.value;
          mascotSavedY.value = mascotOffsetY.value;
        }),
    [mascotOffsetX, mascotOffsetY, mascotSavedX, mascotSavedY],
  );

  const runPrimaryAction = (action: MoChiPrimaryAction) => {
    if (action === 'scanFood') {
      navigation.navigate('AiCamera');
      return;
    }

    if (action === 'addMeal') {
      navigation.navigate('FoodSearch', {
        autoFocus: true,
        showQuickSuggestions: true,
        returnToDiaryOnSave: true,
      });
      return;
    }

    if (action === 'water') {
      navigation.navigate('AppTabs', {
        screen: 'HomeTab',
        params: {
          source: 'water-quick-action',
          focusWaterRequestId: Date.now(),
        },
      });
      return;
    }

    if (action === 'viewProgress') {
      navigation.navigate('Achievements');
      return;
    }

    if (action === 'viewDiary') {
      navigation.navigate('AppTabs', { screen: 'HomeTab' });
      return;
    }

    setDismissedEvent(petState.eventType);
  };

  return (
    <>
      <GestureDetector gesture={mascotPanGesture}>
        <Animated.View
          entering={FadeInUp.delay(500).springify()}
          style={[styles.fabContainer, floatStyle]}
        >
          {shouldBubble && (
            <Animated.View
              entering={SlideInRight.delay(900)
                .duration(260)
                .easing(Easing.out(Easing.ease))}
              style={[styles.chatBubbleWrap, bubbleBounceStyle]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mở gợi ý MoChi"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  runPrimaryAction(petState.primaryAction);
                }}
                onLongPress={() => setDismissedEvent(petState.eventType)}
                style={styles.chatBubble}
              >
                <ThemedText style={styles.chatBubbleTitle}>MoChi</ThemedText>
                <ThemedText style={styles.chatBubbleText} numberOfLines={3}>
                  {petState.dialogue}
                </ThemedText>
              </Pressable>
              <View style={styles.chatBubbleArrow} />
            </Animated.View>
          )}

          <Pressable
            style={styles.fab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowQuickActions(true);
            }}
            onLongPress={() => runPrimaryAction(petState.primaryAction)}
            testID={TEST_IDS.home.mascotButton}
            nativeID={TEST_IDS.home.fabButton}
            accessibilityRole="button"
            accessibilityLabel="Mở trợ lý MoChi"
          >
            <MascotCharacter
              state={mascotState}
              poseKey={petState.poseKey}
              hasReminder={hasReminders || shouldBubble}
              size={72}
            />

            {(hasReminders || shouldBubble) && (
              <View style={styles.fabPingContainer}>
                <Animated.View
                  entering={FadeIn.delay(800)}
                  style={[styles.fabPing, { backgroundColor: '#f59e0b' }]}
                />
                <View style={[styles.fabDot, { backgroundColor: '#f59e0b' }]} />
              </View>
            )}
          </Pressable>
        </Animated.View>
      </GestureDetector>

      <QuickActionsOverlay
        visible={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        reminders={reminders}
        onScanFood={() => {
          setShowQuickActions(false);
          navigation.navigate('AiCamera');
        }}
        onAddMeal={() => {
          setShowQuickActions(false);
          navigation.navigate('FoodSearch', {
            autoFocus: true,
            showQuickSuggestions: true,
            returnToDiaryOnSave: true,
          });
        }}
        onRecipes={() => {
          setShowQuickActions(false);
          navigation.navigate('RecipeSuggestions', {});
        }}
        onWater={() => {
          setShowQuickActions(false);
          navigation.navigate('AppTabs', {
            screen: 'HomeTab',
            params: {
              source: 'water-quick-action',
              focusWaterRequestId: Date.now(),
            },
          });
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 170,
    right: 20,
    zIndex: 1000,
    elevation: 10,
    alignItems: 'flex-end',
  },
  fab: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(15, 23, 42, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4be277',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  fabPingContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.6,
  },
  fabDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0a0e1a',
  },
  chatBubbleWrap: {
    position: 'absolute',
    bottom: 84,
    right: 0,
    alignItems: 'flex-end',
  },
  chatBubble: {
    maxWidth: 230,
    minWidth: 158,
    backgroundColor: 'rgba(30, 35, 50, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#4be277',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  chatBubbleTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#86efac',
    letterSpacing: 0.4,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  chatBubbleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dee1f7',
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  chatBubbleArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(30, 35, 50, 0.95)',
    marginRight: 24,
  },
});

export default MascotOverlay;
