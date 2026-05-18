import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { canShowMoChiTopOverlay } from './mochiReminderOrchestrator';
import { useMoChiNotificationInboxStore, type MoChiNotificationItem } from './mochiNotificationInbox';
import {
  isMoChiVisibleTargetInline,
  useMoChiVisibleTargetsStore,
} from './mochiVisibleTargets';
import type { MoChiNudgeCandidate } from './useMoChiNudgeContext';

const UNSAFE_TOP_OVERLAY_ROUTES = new Set([
  'AiCamera',
  'AddMealFromVision',
  'FoodSearch',
  'FoodDetail',
  'NotificationCenter',
]);

const severityRank: Record<MoChiNotificationItem['severity'], number> = {
  critical: 4,
  timeSensitive: 3,
  active: 2,
  passive: 1,
};

const isRouteCollisionSafe = (routeName?: string | null): boolean =>
  !UNSAFE_TOP_OVERLAY_ROUTES.has(routeName ?? '');

export const useMoChiTopNotificationCandidate = (
  currentRouteName?: string | null,
): MoChiNudgeCandidate | null => {
  const items = useMoChiNotificationInboxStore((state) => state.items);
  const visibleTargets = useMoChiVisibleTargetsStore((state) => state.visibleTargets);
  const [clockVersion, setClockVersion] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockVersion((value) => value + 1);
    }, 60 * 1000);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setClockVersion((value) => value + 1);
      }
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return useMemo(() => {
    const routeName = currentRouteName ?? 'global';
    const now = new Date();
    const candidate = items
      .filter((item) => !item.resolvedAt)
      .sort((left, right) => {
        const rankDelta = severityRank[right.severity] - severityRank[left.severity];
        if (rankDelta !== 0) {
          return rankDelta;
        }

        return Date.parse(right.createdAt) - Date.parse(left.createdAt);
      })
      .find(
        (item) =>
          !isMoChiVisibleTargetInline({
            visibleTargets,
            routeName,
            eventType: item.eventType,
          })
          && canShowMoChiTopOverlay(item, routeName, now).shouldShow,
      );

    if (!candidate || !isRouteCollisionSafe(routeName)) {
      return null;
    }

    return {
      eventType: candidate.eventType,
      routeName,
      preferredSurface: 'overlay',
      hasStrongTiming: true,
      isCollisionSafe: true,
      placement: 'top',
      inboxItemId: candidate.id,
      notificationAction: candidate.action,
      notificationCategory: candidate.category,
      notificationSeverity: candidate.severity,
      mealTypeId: candidate.mealTypeId,
      bypassOverlayCooldown: Boolean(candidate.dismissedAt && candidate.retryAfter),
      title: candidate.title,
      message: candidate.body,
      ctaLabel: candidate.ctaLabel,
    };
  }, [clockVersion, currentRouteName, items, visibleTargets]);
};
