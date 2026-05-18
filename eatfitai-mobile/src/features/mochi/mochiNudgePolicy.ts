import type { NotificationDecision } from '../../services/notificationService';
import {
  getMoChiExperience,
  type MoChiExperienceDomain,
} from './mochiExperienceCatalog';
import type { MoChiPetEventType } from './mochiPetEngine';

export type MoChiSurface =
  | 'dock'
  | 'inline'
  | 'overlay'
  | 'toast'
  | 'systemNotification'
  | 'none';

export type MoChiNudgeCategory =
  | 'critical'
  | 'task'
  | 'celebration'
  | 'ambient'
  | 'live';

export type MoChiPolicyAction = 'shown' | 'dismissed' | 'acted';

export interface MoChiPolicyEventRecord {
  lastShownAt?: string;
  lastDismissedAt?: string;
  lastActedAt?: string;
  dismissCount: number;
  suppressUntil?: string | null;
}

export interface MoChiPolicyMemory {
  dayKey: string;
  dailyMessageCount: number;
  records: Record<string, MoChiPolicyEventRecord>;
}

export interface MoChiPolicySession {
  overlayCount: number;
  messageCount: number;
}

export interface MoChiSurfaceDecision {
  shouldShow: boolean;
  eventType: MoChiPetEventType;
  surface: MoChiSurface;
  category: MoChiNudgeCategory;
  cadenceKey: string;
  priority: number;
  reason: string;
  autoHideMs: number | null;
}

export interface MoChiSurfaceDecisionInput {
  eventType: MoChiPetEventType;
  routeName?: string | null;
  preferredSurface?: Exclude<MoChiSurface, 'none'>;
  hasStrongTiming?: boolean;
  isCollisionSafe?: boolean;
  activeLiveEventKey?: string | null;
  backendDecision?: NotificationDecision | null;
  memory?: MoChiPolicyMemory | null;
  session?: MoChiPolicySession | null;
  now?: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DISMISS_SUPPRESSION_MS = 3 * DAY_MS;
const MAX_SESSION_OVERLAYS = 2;
const MAX_DAILY_TRANSIENT_MESSAGES = 3;

const LIVE_EVENTS = new Set<MoChiPetEventType>([
  'scan_processing',
  'voice_listening',
  'recipe_searching',
]);

const ERROR_EVENTS = new Set<MoChiPetEventType>([
  'scan_error',
  'scan_empty',
  'voice_error',
  'food_search_error',
  'recipe_error',
  'generic_error',
  'app_offline',
]);

const CELEBRATION_EVENTS = new Set<MoChiPetEventType>([
  'meal_logged',
  'water_added',
  'streak_unlocked',
  'achievement_unlocked',
  'scan_success',
  'voice_success',
  'recipe_success',
  'favorite_saved',
]);

const AMBIENT_EVENTS = new Set<MoChiPetEventType>([
  'app_idle',
  'companion_rest',
  'companion_love',
  'companion_determined',
  'companion_box_idle',
]);

const getDayKey = (date: Date): string => date.toISOString().slice(0, 10);

const parseTime = (value?: string | null): number | null => {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
};

const addMsIso = (date: Date, ms: number): string =>
  new Date(date.getTime() + ms).toISOString();

const getCadenceKey = (eventType: MoChiPetEventType, routeName?: string | null): string =>
  `${eventType}:${routeName ?? 'global'}`;

export const createEmptyMoChiPolicyMemory = (now: Date = new Date()): MoChiPolicyMemory => ({
  dayKey: getDayKey(now),
  dailyMessageCount: 0,
  records: {},
});

export const normalizeMoChiPolicyMemory = (
  memory: MoChiPolicyMemory | null | undefined,
  now: Date = new Date(),
): MoChiPolicyMemory => {
  const dayKey = getDayKey(now);
  if (!memory || memory.dayKey !== dayKey) {
    return {
      dayKey,
      dailyMessageCount: 0,
      records: memory?.records ?? {},
    };
  }

  return {
    dayKey,
    dailyMessageCount: Number(memory.dailyMessageCount) || 0,
    records: memory.records ?? {},
  };
};

const resolveCategory = (
  eventType: MoChiPetEventType,
  domain: MoChiExperienceDomain,
): MoChiNudgeCategory => {
  if (LIVE_EVENTS.has(eventType)) return 'live';
  if (ERROR_EVENTS.has(eventType) || domain === 'system') return 'critical';
  if (CELEBRATION_EVENTS.has(eventType)) return 'celebration';
  if (AMBIENT_EVENTS.has(eventType) || domain === 'companion') return 'ambient';
  return 'task';
};

const defaultSurfaceForCategory = (category: MoChiNudgeCategory): Exclude<MoChiSurface, 'none'> => {
  switch (category) {
    case 'critical':
      return 'toast';
    case 'celebration':
      return 'toast';
    case 'ambient':
      return 'dock';
    case 'live':
      return 'inline';
    case 'task':
    default:
      return 'inline';
  }
};

const autoHideForSurface = (
  surface: MoChiSurface,
  category: MoChiNudgeCategory,
): number | null => {
  if (surface === 'overlay') return category === 'critical' ? 9000 : 6500;
  if (surface === 'toast') return category === 'critical' ? 5000 : 3600;
  return null;
};

const makeDecision = (
  input: Required<Pick<MoChiSurfaceDecisionInput, 'eventType'>>,
  surface: MoChiSurface,
  category: MoChiNudgeCategory,
  cadenceKey: string,
  priority: number,
  reason: string,
): MoChiSurfaceDecision => ({
  shouldShow: surface !== 'none',
  eventType: input.eventType,
  surface,
  category,
  cadenceKey,
  priority,
  reason,
  autoHideMs: autoHideForSurface(surface, category),
});

export const resolveMoChiSurfaceDecision = (
  input: MoChiSurfaceDecisionInput,
): MoChiSurfaceDecision => {
  const now = input.now ?? new Date();
  const memory = normalizeMoChiPolicyMemory(input.memory, now);
  const experience = getMoChiExperience(input.eventType);
  const category = resolveCategory(input.eventType, experience.domain);
  const cadenceKey = getCadenceKey(input.eventType, input.routeName);
  const record = memory.records[cadenceKey];
  const preferredSurface =
    input.preferredSurface ?? defaultSurfaceForCategory(category);
  const priority = experience.priority;

  if (input.backendDecision?.shouldNudge === false) {
    return makeDecision(input, 'none', category, cadenceKey, priority, 'backend-suppressed');
  }

  const backendSuppressUntil = parseTime(input.backendDecision?.suppressUntil);
  if (backendSuppressUntil && backendSuppressUntil > now.getTime()) {
    return makeDecision(input, 'none', category, cadenceKey, priority, 'backend-suppress-until');
  }

  const suppressUntil = parseTime(record?.suppressUntil);
  if (category !== 'critical' && suppressUntil && suppressUntil > now.getTime()) {
    return makeDecision(input, 'none', category, cadenceKey, priority, 'dismiss-suppressed');
  }

  if (category === 'live') {
    if (input.activeLiveEventKey && input.activeLiveEventKey !== cadenceKey) {
      return makeDecision(input, 'none', category, cadenceKey, priority, 'live-stack');
    }

    return makeDecision(input, 'inline', category, cadenceKey, priority, 'live');
  }

  if (preferredSurface === 'systemNotification') {
    const lastShownAt = parseTime(record?.lastShownAt);
    if (lastShownAt && now.getTime() - lastShownAt < DAY_MS) {
      return makeDecision(input, 'none', category, cadenceKey, priority, 'system-cooldown');
    }

    return makeDecision(input, 'systemNotification', category, cadenceKey, priority, 'system');
  }

  if (preferredSurface === 'overlay') {
    if (category === 'ambient' || category === 'celebration') {
      return makeDecision(
        input,
        defaultSurfaceForCategory(category),
        category,
        cadenceKey,
        priority,
        'overlay-not-needed',
      );
    }

    if (!input.hasStrongTiming) {
      return makeDecision(input, 'inline', category, cadenceKey, priority, 'weak-timing');
    }

    if (input.isCollisionSafe === false) {
      return makeDecision(input, 'inline', category, cadenceKey, priority, 'collision-risk');
    }

    if ((input.session?.overlayCount ?? 0) >= MAX_SESSION_OVERLAYS) {
      return makeDecision(input, 'inline', category, cadenceKey, priority, 'session-overlay-cap');
    }

    const lastShownAt = parseTime(record?.lastShownAt);
    if (lastShownAt && now.getTime() - lastShownAt < DAY_MS) {
      return makeDecision(input, 'inline', category, cadenceKey, priority, 'overlay-cooldown');
    }

    if (
      category !== 'critical'
      && memory.dailyMessageCount >= MAX_DAILY_TRANSIENT_MESSAGES
    ) {
      return makeDecision(input, 'inline', category, cadenceKey, priority, 'daily-message-cap');
    }

    return makeDecision(input, 'overlay', category, cadenceKey, priority, 'overlay');
  }

  if (
    preferredSurface === 'toast'
    && category !== 'critical'
    && memory.dailyMessageCount >= MAX_DAILY_TRANSIENT_MESSAGES
  ) {
    return makeDecision(input, 'dock', category, cadenceKey, priority, 'daily-message-cap');
  }

  return makeDecision(input, preferredSurface, category, cadenceKey, priority, preferredSurface);
};

export const recordMoChiPolicyEvent = (
  memory: MoChiPolicyMemory | null | undefined,
  decision: MoChiSurfaceDecision,
  action: MoChiPolicyAction,
  now: Date = new Date(),
): MoChiPolicyMemory => {
  const next = normalizeMoChiPolicyMemory(memory, now);
  const previous = next.records[decision.cadenceKey] ?? { dismissCount: 0 };
  const record: MoChiPolicyEventRecord = { ...previous };

  if (action === 'shown') {
    record.lastShownAt = now.toISOString();
    if (['overlay', 'toast', 'systemNotification'].includes(decision.surface)) {
      next.dailyMessageCount += 1;
    }
  } else if (action === 'dismissed') {
    record.lastDismissedAt = now.toISOString();
    record.dismissCount = (record.dismissCount ?? 0) + 1;
    if (record.dismissCount >= 2) {
      record.suppressUntil = addMsIso(now, DISMISS_SUPPRESSION_MS);
    }
  } else if (action === 'acted') {
    record.lastActedAt = now.toISOString();
    record.dismissCount = 0;
    record.suppressUntil = null;
  }

  return {
    ...next,
    records: {
      ...next.records,
      [decision.cadenceKey]: record,
    },
  };
};
