import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  FadeInUp,
  FadeIn,
  FadeOut,
  SlideInRight,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import QuickActionsOverlay from './home/QuickActionsOverlay';
import { waterService } from '../services/waterService';
import type { WaterIntakeData } from '../services/waterService';
import { TEST_IDS } from '../testing/testIds';
import { useMealReminders } from '../hooks/useMealReminders';
import { ThemedText } from './ThemedText';

const MascotOverlay = () => {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { reminders, hasReminders, bubbleText } = useMealReminders();

  // Robot FAB floating animation & Drag gesture
  const floatAnim = useSharedValue(0);
  const robotOffsetX = useSharedValue(0);
  const robotOffsetY = useSharedValue(0);
  const robotSavedX = useSharedValue(0);
  const robotSavedY = useSharedValue(0);

  // Chat bubble bounce animation
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
  }, []);

  // Subtle bounce for the chat bubble every 6 seconds
  useEffect(() => {
    if (!hasReminders) return;
    bubbleBounce.value = withRepeat(
      withSequence(
        withDelay(6000, withSpring(-4, { damping: 4, stiffness: 300 })),
        withSpring(0, { damping: 6, stiffness: 200 }),
      ),
      -1,
      false,
    );
    return () => {
      bubbleBounce.value = 0;
    };
  }, [hasReminders]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: robotOffsetX.value },
      { translateY: floatAnim.value + robotOffsetY.value },
    ],
  }));

  const bubbleBounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bubbleBounce.value }],
  }));

  const robotPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((e) => {
          robotOffsetX.value = robotSavedX.value + e.translationX;
          robotOffsetY.value = robotSavedY.value + e.translationY;
        })
        .onEnd(() => {
          robotSavedX.value = robotOffsetX.value;
          robotSavedY.value = robotOffsetY.value;
        }),
    [robotOffsetX, robotOffsetY, robotSavedX, robotSavedY],
  );

  const handleAddWater = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic Update
    const prevData = queryClient.getQueryData<WaterIntakeData>(['water-intake-today']);
    queryClient.setQueryData<WaterIntakeData>(['water-intake-today'], (old) => ({
      amountMl: (old?.amountMl ?? 0) + 200,
      targetMl: old?.targetMl ?? 2000,
      date: old?.date ?? new Date().toISOString().split('T')[0]!,
    }));

    try {
      await waterService.addWater(new Date());
    } catch (err: any) {
      if (prevData) {
        queryClient.setQueryData(['water-intake-today'], prevData);
      }
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không thể cập nhật lượng nước' });
    }
  }, [queryClient]);

  const C = {
    bg: '#0a0e1a',
    primary: '#4be277',
    primaryDark: '#22c55e',
  };

  return (
    <>
      <GestureDetector gesture={robotPanGesture}>
        <Animated.View
          entering={FadeInUp.delay(500).springify()}
          style={[styles.fabContainer, floatStyle]}
        >
          {/* ── Chat Bubble (chỉ hiện khi có nhắc nhở) ── */}
          {hasReminders && bubbleText && (
            <Animated.View
              entering={SlideInRight.delay(1200).springify().damping(14)}
              style={[styles.chatBubbleWrap, bubbleBounceStyle]}
            >
              <View style={styles.chatBubble}>
                <ThemedText style={styles.chatBubbleText} numberOfLines={2}>
                  {bubbleText}
                </ThemedText>
              </View>
              {/* Mũi tên nhỏ trỏ xuống Mascot */}
              <View style={styles.chatBubbleArrow} />
            </Animated.View>
          )}

          <Pressable
            style={styles.fab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowQuickActions(true);
            }}
            testID={TEST_IDS.home?.fabButton}
          >
            {/* Robot face */}
            <View style={styles.robotFace}>
              <View style={styles.robotVisor}>
                <View style={styles.robotEye} />
                <View style={styles.robotEye} />
              </View>
              <View style={styles.robotMouth} />
            </View>

            {/* Ping dot – đổi sang màu cảnh báo khi có reminder */}
            <View style={styles.fabPingContainer}>
              <Animated.View
                entering={FadeIn.delay(800)}
                style={[
                  styles.fabPing,
                  hasReminders && { backgroundColor: '#f59e0b' },
                ]}
              />
              <View
                style={[
                  styles.fabDot,
                  hasReminders && { backgroundColor: '#f59e0b' },
                ]}
              />
            </View>
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
          navigation.navigate('FoodSearch', { autoFocus: true, showQuickSuggestions: true, returnToDiaryOnSave: true });
        }}
        onRecipes={() => {
          setShowQuickActions(false);
          navigation.navigate('RecipeSuggestions', {});
        }}
        onWater={() => {
          handleAddWater();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
    elevation: 10,
    // Cần đủ không gian cho bubble phía trên
    alignItems: 'flex-end',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E2332',
    borderWidth: 2,
    borderColor: 'rgba(75, 226, 119, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4be277',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  robotFace: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  robotVisor: {
    width: 28,
    height: 14,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  robotEye: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22D3EE',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 2,
  },
  robotMouth: {
    width: 24,
    height: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 1,
    marginTop: 4,
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
    backgroundColor: '#4be277',
    opacity: 0.6,
  },
  fabDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4be277',
    borderWidth: 2,
    borderColor: '#0a0e1a',
  },

  /* ── Chat Bubble ── */
  chatBubbleWrap: {
    position: 'absolute',
    bottom: 72, // ngay phía trên FAB (64px FAB + 8px gap)
    right: 0,
    alignItems: 'flex-end',
  },
  chatBubble: {
    maxWidth: 200,
    minWidth: 140,
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
    marginRight: 20, // Căn mũi tên về phía Mascot
  },
});

export default MascotOverlay;
