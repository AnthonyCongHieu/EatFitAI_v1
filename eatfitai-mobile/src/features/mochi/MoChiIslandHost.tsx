import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../../components/ThemedText';
import { useSmartReminders } from '../../hooks/useSmartReminders';
import { useDiaryStore } from '../../store/useDiaryStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useVoiceStore } from '../../store/useVoiceStore';
import { waterService, type WaterIntakeData } from '../../services/waterService';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useEN } from '../../theme/emeraldNebula';
import MoChiSprite from './MoChiSprite';
import {
  getMoChiIslandState,
  type MoChiIslandConfirmationAction,
} from './mochiIslandEngine';
import { useMoChiIslandLayoutController } from './MoChiIslandLayoutContext';

type MoChiIslandHostProps = {
  currentRouteName?: string;
};

const MAIN_TAB_ROUTES = new Set(['HomeTab', 'VoiceTab', 'StatsTab', 'ProfileTab']);
const REMINDER_COOLDOWN_MS = 20 * 60 * 1000;

const runHaptic = () => {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const MoChiIslandHost = ({
  currentRouteName,
}: MoChiIslandHostProps): React.ReactElement | null => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const EN = useEN();
  const { mode } = useAppTheme();
  const { setIslandLayout } = useMoChiIslandLayoutController();
  const [dismissedEvent, setDismissedEvent] = useState<{
    eventType: string;
    cooldownKey: string | null;
    dismissedAt: number;
  } | null>(null);
  const { reminders } = useSmartReminders();
  const summary = useDiaryStore((s) => s.summary);
  const currentStreak = useGamificationStore((s) => s.currentStreak);
  const totalXP = useGamificationStore((s) => s.totalXP);
  const achievements = useGamificationStore((s) => s.achievements);
  const voiceStatus = useVoiceStore((s) => s.status);

  const { data: waterData } = useQuery<WaterIntakeData>({
    queryKey: ['water-intake-today'],
    queryFn: () => waterService.getWaterIntake(new Date()),
    staleTime: 2 * 60 * 1000,
  });

  const islandState = useMemo(
    () =>
      getMoChiIslandState({
        routeName: currentRouteName,
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
        voiceStatus,
        dismissedEventType:
          dismissedEvent && Date.now() - dismissedEvent.dismissedAt < REMINDER_COOLDOWN_MS
            ? (dismissedEvent.eventType as any)
            : null,
        dismissedCooldownKey:
          dismissedEvent && Date.now() - dismissedEvent.dismissedAt < REMINDER_COOLDOWN_MS
            ? dismissedEvent.cooldownKey
            : null,
      }),
    [
      achievements,
      currentRouteName,
      currentStreak,
      dismissedEvent,
      reminders,
      summary,
      totalXP,
      voiceStatus,
      waterData,
    ],
  );

  const dismissIslandEvent = useCallback((eventType: string, cooldownKey: string | null = null) => {
    setDismissedEvent({ eventType, cooldownKey, dismissedAt: Date.now() });
  }, []);

  useEffect(() => {
    if (!islandState.autoHideMs) {
      return;
    }

    const timer = setTimeout(() => {
      dismissIslandEvent(islandState.eventType, islandState.cooldownKey);
    }, islandState.autoHideMs);

    return () => clearTimeout(timer);
  }, [dismissIslandEvent, islandState.autoHideMs, islandState.eventType]);

  const isVisible = Boolean(currentRouteName && MAIN_TAB_ROUTES.has(currentRouteName));
  const isCompact = islandState.mode === 'compact';
  const isHomeHeaderAnchored = currentRouteName === 'HomeTab';
  const isLongExpandedMessage =
    !isCompact &&
    Boolean(islandState.confirmationAction) &&
    (islandState.message?.length ?? 0) > 58;

  useEffect(() => {
    setIslandLayout({
      mode: isVisible ? islandState.mode : 'compact',
      height: isVisible ? islandState.presentation.height : 42,
      topOffset: isVisible && !isHomeHeaderAnchored ? islandState.presentation.reservedHeight : 0,
      isExpanded: isVisible ? !isCompact : false,
    });
  }, [
    isCompact,
    islandState.mode,
    islandState.presentation.height,
    islandState.presentation.reservedHeight,
    isHomeHeaderAnchored,
    isVisible,
    setIslandLayout,
  ]);

  if (!isVisible) {
    return null;
  }

  const runConfirmation = (action: MoChiIslandConfirmationAction) => {
    runHaptic();

    if (action === 'addMeal') {
      navigation.navigate('FoodSearch', {
        autoFocus: false,
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

    if (action === 'reviewVoice') {
      navigation.navigate('AppTabs', { screen: 'VoiceTab' });
      return;
    }

    if (action === 'scanFood') {
      navigation.navigate('AiCamera');
      return;
    }

    if (action === 'viewProgress') {
      navigation.navigate('AppTabs', { screen: 'StatsTab' });
      return;
    }

    dismissIslandEvent(islandState.eventType, islandState.cooldownKey);
  };

  const maxWidth = Math.min(width - (isHomeHeaderAnchored ? 40 : 24), 388);
  const islandWidth = isCompact ? (isHomeHeaderAnchored ? 46 : 54) : maxWidth;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        isHomeHeaderAnchored
          ? {
              top: insets.top + 8,
              left: 20,
              right: undefined,
              alignItems: 'flex-start',
            }
          : { top: insets.top + 8 },
      ]}
    >
      <Animated.View
        entering={FadeInDown.duration(220)}
        exiting={FadeOutUp.duration(160)}
        layout={LinearTransition.springify().damping(22).stiffness(260)}
        style={[
          styles.island,
          isCompact ? styles.compactIsland : styles.expandedIsland,
          {
            width: islandWidth,
            height: islandState.presentation.height,
            maxWidth,
            backgroundColor: mode === 'light'
              ? 'rgba(255, 255, 255, 0.96)'
              : 'rgba(10, 14, 26, 0.94)',
            borderColor: EN.glassBorder,
            shadowColor: EN.primary,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isCompact ? 'MoChi đang theo dõi ngữ cảnh' : islandState.message ?? 'Thông báo MoChi'
          }
          onPress={() => {
            if (islandState.confirmationAction) {
              runConfirmation(islandState.confirmationAction);
              return;
            }
            if (!isCompact) {
              runHaptic();
              dismissIslandEvent(islandState.eventType, islandState.cooldownKey);
            }
          }}
          onLongPress={() => dismissIslandEvent(islandState.eventType, islandState.cooldownKey)}
          style={[styles.islandContent, isCompact && styles.compactContent]}
        >
          <MoChiSprite
            poseKey={islandState.poseKey}
            size={islandState.presentation.spriteSize}
            variant={isCompact ? 'face' : islandState.presentation.spriteVariant}
            animated={!isCompact}
          />

          {!isCompact && islandState.message && (
            <View style={styles.messageWrap}>
              <ThemedText
                style={[styles.message, { color: EN.onSurface }]}
                numberOfLines={
                  isLongExpandedMessage ? undefined : islandState.presentation.maxLines
                }
              >
                {islandState.message}
              </ThemedText>
              {isLongExpandedMessage && islandState.ctaLabel && (
                <View style={[styles.ctaPill, styles.longIslandCta, { backgroundColor: EN.primary }]}>
                  <ThemedText style={styles.ctaText}>{islandState.ctaLabel}</ThemedText>
                </View>
              )}
            </View>
          )}

          {!isCompact &&
            !isLongExpandedMessage &&
            islandState.confirmationAction &&
            islandState.ctaLabel && (
            <View style={[styles.ctaPill, { backgroundColor: EN.primary }]}>
              <ThemedText style={styles.ctaText}>{islandState.ctaLabel}</ThemedText>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1200,
    elevation: 24,
    alignItems: 'center',
  },
  island: {
    borderRadius: 999,
    backgroundColor: 'rgba(10, 14, 26, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.22)',
    shadowColor: '#4be277',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 12,
    overflow: 'hidden',
  },
  compactIsland: {
    borderRadius: 999,
  },
  expandedIsland: {
    minWidth: 284,
    borderRadius: 28,
  },
  islandContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 8,
  },
  compactContent: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  messageWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 2,
  },
  message: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dee1f7',
    lineHeight: 18,
  },
  ctaPill: {
    borderRadius: 999,
    backgroundColor: '#4be277',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  longIslandCta: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003915',
  },
});

export default MoChiIslandHost;
