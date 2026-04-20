import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeInUp,
  FadeIn,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { useAppTheme } from '../theme/ThemeProvider';
import QuickActionsOverlay from './home/QuickActionsOverlay';
import { waterService } from '../services/waterService';
import type { WaterIntakeData } from '../services/waterService';
import { TEST_IDS } from '../testing/testIds';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MascotOverlay = () => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Robot FAB floating animation & Drag gesture
  const floatAnim = useSharedValue(0);
  const robotOffsetX = useSharedValue(0);
  const robotOffsetY = useSharedValue(0);
  const robotSavedX = useSharedValue(0);
  const robotSavedY = useSharedValue(0);

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

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: robotOffsetX.value },
      { translateY: floatAnim.value + robotOffsetY.value },
    ],
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
      date: old?.date ?? new Date().toISOString().split('T')[0]!
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

  const styles = StyleSheet.create({
    fabContainer: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      zIndex: 1000,
      elevation: 10,
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
      shadowColor: C.primary,
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
      backgroundColor: C.primary,
      opacity: 0.6,
    },
    fabDot: {
      position: 'absolute',
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: C.primary,
      borderWidth: 2,
      borderColor: C.bg,
    },
  });

  return (
    <>
      <GestureDetector gesture={robotPanGesture}>
        <Animated.View
          entering={FadeInUp.delay(500).springify()}
          style={[styles.fabContainer, floatStyle]}
        >
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

            {/* Ping dot */}
            <View style={styles.fabPingContainer}>
              <Animated.View entering={FadeIn.delay(800)} style={styles.fabPing} />
              <View style={styles.fabDot} />
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>

      <QuickActionsOverlay
        visible={showQuickActions}
        onClose={() => setShowQuickActions(false)}
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
          // We can optionally close it, but keeping it open to add more water is also nice.
        }}
      />
    </>
  );
};

export default MascotOverlay;
