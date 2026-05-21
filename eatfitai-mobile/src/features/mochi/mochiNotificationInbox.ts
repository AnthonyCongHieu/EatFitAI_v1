import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { MoChiPetEventType } from './mochiPetEngine';

export type MoChiNotificationCategory = 'reminder' | 'report' | 'tip' | 'system';
export type MoChiNotificationSeverity = 'passive' | 'active' | 'timeSensitive' | 'critical';
export type MoChiNotificationSource =
  | 'orchestrator'
  | 'foreground'
  | 'system'
  | 'tap'
  | 'launch'
  | 'backend';
export type MoChiNotificationAction =
  | 'addMeal'
  | 'addWater'
  | 'viewProgress'
  | 'viewDiary'
  | 'openNotifications'
  | 'dismiss';

export interface MoChiNotificationItem {
  id: string;
  eventType: MoChiPetEventType;
  category: MoChiNotificationCategory;
  severity: MoChiNotificationSeverity;
  source: MoChiNotificationSource;
  title: string;
  body: string;
  ctaLabel?: string;
  action: MoChiNotificationAction;
  mealTypeId?: number;
  dueAt: string;
  createdAt: string;
  readAt?: string;
  actedAt?: string;
  resolvedAt?: string;
  dismissedAt?: string;
  dismissCount?: number;
  expiresAt?: string;
  retryAfter?: string;
}

type MoChiNotificationInboxState = {
  items: MoChiNotificationItem[];
  isHydrated: boolean;
  setHydrated: (value: boolean) => void;
  upsertItem: (item: MoChiNotificationItem, now?: Date) => void;
  markRead: (id: string, now?: Date) => void;
  markActed: (id: string, now?: Date) => void;
  markDismissed: (id: string, now?: Date) => void;
  removeItem: (id: string) => void;
  removeRead: () => void;
  resolveMatching: (
    predicate: (item: MoChiNotificationItem) => boolean,
    now?: Date,
  ) => void;
  prune: (now?: Date) => void;
  clear: () => void;
};

export const MOCHI_NOTIFICATION_INBOX_KEY = '@eatfitai_mochi_notification_inbox_v1';
export const MOCHI_NOTIFICATION_MAX_ITEMS = 50;
export const MOCHI_NOTIFICATION_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const IMPORTANT_RETRY_MS = 60 * 60 * 1000;

const parseTime = (value?: string): number | null => {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
};

const isExpired = (item: MoChiNotificationItem, now: Date): boolean => {
  const expiresAt = parseTime(item.expiresAt);
  if (expiresAt && expiresAt <= now.getTime()) {
    return true;
  }

  const createdAt = parseTime(item.createdAt);
  return Boolean(
    createdAt
      && now.getTime() - createdAt > MOCHI_NOTIFICATION_RETENTION_DAYS * DAY_MS,
  );
};

const shouldRetryAfterDismiss = (item: MoChiNotificationItem): boolean =>
  item.category === 'reminder'
  && item.severity !== 'passive'
  && !item.actedAt
  && !item.resolvedAt;

export const normalizeMoChiInboxItems = (
  items: MoChiNotificationItem[],
  now: Date = new Date(),
): MoChiNotificationItem[] => {
  const deduped = new Map<string, MoChiNotificationItem>();

  for (const item of items) {
    if (isExpired(item, now)) {
      continue;
    }

    const previous = deduped.get(item.id);
    if (!previous) {
      deduped.set(item.id, item);
      continue;
    }

    const previousCreatedAt = parseTime(previous.createdAt) ?? 0;
    const nextCreatedAt = parseTime(item.createdAt) ?? 0;
    deduped.set(item.id, nextCreatedAt >= previousCreatedAt ? item : previous);
  }

  return Array.from(deduped.values())
    .sort((a, b) => (parseTime(b.createdAt) ?? 0) - (parseTime(a.createdAt) ?? 0))
    .slice(0, MOCHI_NOTIFICATION_MAX_ITEMS);
};

export const upsertMoChiNotificationItem = (
  items: MoChiNotificationItem[],
  item: MoChiNotificationItem,
  now: Date = new Date(),
): MoChiNotificationItem[] => {
  const existing = items.find((entry) => entry.id === item.id);
  const nextItem = existing
    ? {
        ...existing,
        ...item,
        createdAt: existing.createdAt || item.createdAt,
        retryAfter: item.retryAfter ?? existing.retryAfter,
      }
    : item;

  return normalizeMoChiInboxItems(
    [nextItem, ...items.filter((entry) => entry.id !== item.id)],
    now,
  );
};

export const markMoChiNotificationRead = (
  items: MoChiNotificationItem[],
  id: string,
  now: Date = new Date(),
): MoChiNotificationItem[] =>
  items.map((item) =>
    item.id === id
      ? { ...item, readAt: item.readAt ?? now.toISOString() }
      : item,
  );

export const markMoChiNotificationActed = (
  items: MoChiNotificationItem[],
  id: string,
  now: Date = new Date(),
): MoChiNotificationItem[] =>
  items.map((item) =>
    item.id === id
      ? {
          ...item,
          readAt: item.readAt ?? now.toISOString(),
          actedAt: now.toISOString(),
          resolvedAt: now.toISOString(),
          retryAfter: undefined,
        }
      : item,
  );

export const markMoChiNotificationDismissed = (
  items: MoChiNotificationItem[],
  id: string,
  now: Date = new Date(),
): MoChiNotificationItem[] =>
  items.map((item) => {
    if (item.id !== id) {
      return item;
    }

    return {
      ...item,
      readAt: item.readAt ?? now.toISOString(),
      dismissedAt: now.toISOString(),
      dismissCount: (item.dismissCount ?? 0) + 1,
      retryAfter: shouldRetryAfterDismiss(item)
        ? new Date(now.getTime() + IMPORTANT_RETRY_MS).toISOString()
        : item.retryAfter,
    };
  });

export const resolveMoChiNotifications = (
  items: MoChiNotificationItem[],
  predicate: (item: MoChiNotificationItem) => boolean,
  now: Date = new Date(),
): MoChiNotificationItem[] =>
  items.map((item) =>
    predicate(item) && !item.resolvedAt
      ? {
          ...item,
          readAt: item.readAt ?? now.toISOString(),
          resolvedAt: now.toISOString(),
          retryAfter: undefined,
        }
      : item,
  );

export const selectUnreadMoChiNotificationCount = (
  items: MoChiNotificationItem[],
): number => items.filter((item) => !item.readAt && !item.resolvedAt).length;

export const toMoChiNotificationItemFromPayload = (
  input: {
    title?: string | null;
    body?: string | null;
    data?: Record<string, unknown> | null;
    source: MoChiNotificationSource;
    now?: Date;
  },
): MoChiNotificationItem | null => {
  const data = input.data ?? {};
  const eventType = data.mochiEventType;
  if (typeof eventType !== 'string') {
    return null;
  }

  const now = input.now ?? new Date();
  const mealTypeId = Number(data.mealTypeId);
  const dateKey = now.toISOString().slice(0, 10);
  const fallbackId = eventType === 'meal_reminder' && Number.isFinite(mealTypeId)
    ? `meal_reminder-${mealTypeId}-${dateKey}`
    : eventType === 'water_reminder'
      ? `water_reminder-${dateKey}`
      : eventType === 'weekly_review'
        ? `weekly-review-${dateKey}`
        : `${eventType}-${dateKey}`;
  const id = typeof data.mochiNotificationId === 'string'
    ? data.mochiNotificationId
    : fallbackId;
  const action = typeof data.mochiAction === 'string'
    ? data.mochiAction
    : 'openNotifications';
  const category = typeof data.mochiCategory === 'string'
    ? data.mochiCategory
    : 'reminder';
  const severity = typeof data.mochiSeverity === 'string'
    ? data.mochiSeverity
    : 'active';
  return {
    id,
    eventType: eventType as MoChiPetEventType,
    category: category as MoChiNotificationCategory,
    severity: severity as MoChiNotificationSeverity,
    source: input.source,
    title: input.title || 'MoChi nhắc bạn',
    body: input.body || 'Có việc cần bạn xem trong EatFitAI.',
    ctaLabel: typeof data.ctaLabel === 'string' ? data.ctaLabel : undefined,
    action: action as MoChiNotificationAction,
    mealTypeId: Number.isFinite(mealTypeId) ? mealTypeId : undefined,
    dueAt: typeof data.dueAt === 'string' ? data.dueAt : now.toISOString(),
    createdAt: now.toISOString(),
    expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : undefined,
    retryAfter: typeof data.retryAfter === 'string' ? data.retryAfter : undefined,
  };
};

export const useMoChiNotificationInboxStore = create<MoChiNotificationInboxState>()(
  persist(
    (set) => ({
      items: [],
      isHydrated: false,
      setHydrated: (value) => set({ isHydrated: value }),
      upsertItem: (item, now = new Date()) =>
        set((state) => ({
          items: upsertMoChiNotificationItem(state.items, item, now),
        })),
      markRead: (id, now = new Date()) =>
        set((state) => ({
          items: markMoChiNotificationRead(state.items, id, now),
        })),
      markActed: (id, now = new Date()) =>
        set((state) => ({
          items: markMoChiNotificationActed(state.items, id, now),
        })),
      markDismissed: (id, now = new Date()) =>
        set((state) => ({
          items: markMoChiNotificationDismissed(state.items, id, now),
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      removeRead: () =>
        set((state) => ({
          items: state.items.filter((item) => !item.readAt && !item.resolvedAt),
        })),
      resolveMatching: (predicate, now = new Date()) =>
        set((state) => ({
          items: resolveMoChiNotifications(state.items, predicate, now),
        })),
      prune: (now = new Date()) =>
        set((state) => ({
          items: normalizeMoChiInboxItems(state.items, now),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: MOCHI_NOTIFICATION_INBOX_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
