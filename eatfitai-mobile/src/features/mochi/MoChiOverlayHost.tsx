import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../components/ThemedText';
import { useEN } from '../../theme/emeraldNebula';
import MoChiSprite from './MoChiSprite';
import { getMoChiExperience } from './mochiExperienceCatalog';
import {
  useMoChiNudgeContext,
  type MoChiNudgeCandidate,
} from './useMoChiNudgeContext';
import { useMoChiSurfaceDecision } from './useMoChiSurfaceDecision';
import { useMoChiTopNotificationCandidate } from './useMoChiTopNotificationCandidate';
import { useMoChiNotificationInboxStore } from './mochiNotificationInbox';
import { performMoChiNotificationAction } from './mochiNotificationActions';
import { useIsMoChiTopOverlayBlocked } from './mochiTransientGate';
import type { MoChiSurfaceDecision } from './mochiNudgePolicy';
import { useMoChiOverlayReadiness } from './useMoChiOverlayReadiness';
import { useMoChiSurfaceCoordinator } from './mochiSurfaceCoordinator';
import { useMoChiSurfacePresence } from './useMoChiSurfacePresence';

type MoChiOverlayHostProps = {
  currentRouteName?: string | null;
};

type ActiveOverlay = {
  candidate: MoChiNudgeCandidate;
  decision: MoChiSurfaceDecision;
};

const DEFAULT_TOP_HEADER_CLEARANCE = 76;
const DENSE_TOP_HEADER_CLEARANCE = 108;
const DENSE_TOP_HEADER_ROUTES = new Set([
  'MealDiary',
  'FoodSearch',
  'NotificationCenter',
  'NotificationsSettings',
  'ProfileTab',
]);

export const resolveMoChiTopOverlayOffset = ({
  topInset,
  routeName,
}: {
  topInset: number;
  routeName?: string | null;
}): number => {
  const routeClearance = DENSE_TOP_HEADER_ROUTES.has(routeName ?? '')
    ? DENSE_TOP_HEADER_CLEARANCE
    : DEFAULT_TOP_HEADER_CLEARANCE;

  return Math.max(topInset, 10) + routeClearance;
};

const MoChiOverlayHost = ({
  currentRouteName,
}: MoChiOverlayHostProps): React.ReactElement | null => {
  const EN = useEN();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const inlineCandidate = useMoChiNudgeContext(currentRouteName);
  const topNotificationCandidate = useMoChiTopNotificationCandidate(currentRouteName);
  const candidate = topNotificationCandidate ?? inlineCandidate;
  const { decision, recordDecision } = useMoChiSurfaceDecision(candidate);
  const isTopOverlayBlocked = useIsMoChiTopOverlayBlocked();
  const isOverlayReady = useMoChiOverlayReadiness(currentRouteName);
  const canShowTopOverlay = useMoChiSurfaceCoordinator((state) => state.canShowTopOverlay);
  const markDismissed = useMoChiNotificationInboxStore((state) => state.markDismissed);
  const markActed = useMoChiNotificationInboxStore((state) => state.markActed);
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay | null>(null);
  const activeOverlaySurfaceId = activeOverlay
    ? `overlay:${activeOverlay.decision.cadenceKey}`
    : undefined;
  const isCoordinatorTopOverlayAllowed = canShowTopOverlay(
    currentRouteName,
    candidate?.eventType,
    activeOverlaySurfaceId,
  );

  useMoChiSurfacePresence({
    id: activeOverlaySurfaceId ?? 'overlay:none',
    surface: 'topOverlay',
    routeName: currentRouteName ?? activeOverlay?.candidate.routeName,
    eventType: activeOverlay?.candidate.eventType,
    priority: 70,
    enabled: Boolean(activeOverlay),
  });

  useEffect(() => {
    if (isTopOverlayBlocked || !isOverlayReady || !isCoordinatorTopOverlayAllowed) {
      setActiveOverlay(null);
      return;
    }

    if (!candidate) {
      setActiveOverlay(null);
      return;
    }

    if (activeOverlay?.decision.cadenceKey === decision?.cadenceKey) {
      return;
    }

    if (!decision?.shouldShow || decision.surface !== 'overlay') {
      return;
    }

    setActiveOverlay({ candidate, decision });
    recordDecision(decision, 'shown');
  }, [
    activeOverlay?.decision.cadenceKey,
    candidate,
    decision,
    isCoordinatorTopOverlayAllowed,
    isOverlayReady,
    isTopOverlayBlocked,
    recordDecision,
  ]);

  const closeOverlay = useCallback(() => {
    if (!activeOverlay) {
      return;
    }

    recordDecision(activeOverlay.decision, 'dismissed');
    if (activeOverlay.candidate.inboxItemId) {
      markDismissed(activeOverlay.candidate.inboxItemId);
    }
    setActiveOverlay(null);
  }, [activeOverlay, markDismissed, recordDecision]);

  const actOnOverlay = useCallback(() => {
    if (!activeOverlay) {
      return;
    }

    recordDecision(activeOverlay.decision, 'acted');
    if (activeOverlay.candidate.inboxItemId) {
      markActed(activeOverlay.candidate.inboxItemId);
    }
    setActiveOverlay(null);

    performMoChiNotificationAction(
      activeOverlay.candidate.notificationAction
        ?? (activeOverlay.candidate.eventType === 'water_reminder' ? 'addWater' : 'addMeal'),
      activeOverlay.candidate.mealTypeId,
    );
  }, [activeOverlay, markActed, recordDecision]);

  useEffect(() => {
    const autoHideMs = activeOverlay?.candidate.inboxItemId
      ? activeOverlay.candidate.notificationCategory === 'report'
        ? 6000
        : 8000
      : activeOverlay?.decision.autoHideMs;

    if (!autoHideMs) {
      return;
    }

    const timer = setTimeout(closeOverlay, autoHideMs);
    return () => clearTimeout(timer);
  }, [
    activeOverlay?.candidate.inboxItemId,
    activeOverlay?.candidate.notificationCategory,
    activeOverlay?.decision.autoHideMs,
    closeOverlay,
  ]);

  if (!activeOverlay) {
    return null;
  }

  const experience = getMoChiExperience(activeOverlay.candidate.eventType);
  const stageWidth = Math.min(width - 40, 340);
  const topOffset = resolveMoChiTopOverlayOffset({
    topInset: insets.top,
    routeName: currentRouteName ?? activeOverlay.candidate.routeName,
  });

  return (
    <View pointerEvents="box-none" style={styles.companionOverlay}>
      <Animated.View
        accessibilityLabel="MoChi đang nhắc bạn"
        entering={FadeInDown.duration(180)}
        exiting={FadeOutUp.duration(140)}
        pointerEvents="box-none"
        style={[
          styles.companionStage,
          {
            top: topOffset,
            width: stageWidth,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={activeOverlay.candidate.message}
          onPress={actOnOverlay}
          onLongPress={closeOverlay}
          style={styles.companionSpriteHitbox}
        >
          <MoChiSprite
            poseKey={experience.poseKey}
            size={60}
            variant="full"
            animated
            testID="mochi-overlay-sprite"
          />
        </Pressable>

        <View
          style={[
            styles.companionSpeech,
            {
              backgroundColor: EN.glassBg,
              borderColor: EN.outlineVariant,
              shadowColor: EN.primary,
            },
          ]}
        >
          <View style={[styles.companionSpeechTail, { borderRightColor: EN.glassBg }]} />
          <View style={styles.companionHeader}>
            <ThemedText style={[styles.companionEyebrow, { color: EN.primary }]} numberOfLines={1}>
              {activeOverlay.candidate.title}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ẩn nhắc nhở MoChi"
              hitSlop={8}
              onPress={closeOverlay}
              style={styles.companionDismiss}
            >
              <Ionicons name="close" size={15} color={EN.textMuted} />
            </Pressable>
          </View>
          <ThemedText style={[styles.companionMessage, { color: EN.onSurface }]} numberOfLines={2}>
            {activeOverlay.candidate.message}
          </ThemedText>
          {activeOverlay.candidate.ctaLabel && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={activeOverlay.candidate.ctaLabel}
              onPress={actOnOverlay}
              style={styles.companionCtaHitbox}
            >
              <ThemedText style={[styles.companionCta, { color: EN.primary }]} numberOfLines={1}>
                {activeOverlay.candidate.ctaLabel}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  companionOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 800,
    elevation: 18,
  },
  companionStage: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companionSpriteHitbox: {
    width: 58,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionSpeech: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  companionSpeechTail: {
    position: 'absolute',
    left: -6,
    bottom: 18,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 7,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  companionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  companionEyebrow: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  companionDismiss: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionMessage: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    lineHeight: 16,
  },
  companionCtaHitbox: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  companionCta: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    lineHeight: 16,
  },
});

export default MoChiOverlayHost;
