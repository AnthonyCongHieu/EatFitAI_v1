import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../config/env';
import logger from '../utils/logger';
import { fetchWithAuthRetry, getCurrentApiUrl } from './apiClient';

const TELEMETRY_QUEUE_KEY = '@eatfitai_telemetry_queue';
const TELEMETRY_SESSION_KEY = '@eatfitai_telemetry_session';
const MAX_QUEUE_SIZE = 200;
const BATCH_SIZE = 25;

export type TelemetryMetadata = Record<string, unknown> | null | undefined;

export type TelemetryEventInput = {
  name: string;
  category: string;
  occurredAt?: string;
  screen?: string;
  flow?: string;
  step?: string;
  status?: string;
  sessionId?: string;
  metadata?: TelemetryMetadata;
};

export type TelemetryEventRecord = {
  name: string;
  category: string;
  occurredAt: string;
  screen: string | null;
  flow: string | null;
  step: string | null;
  status: string | null;
  sessionId: string;
  metadata: Record<string, unknown> | null;
};

let queue: TelemetryEventRecord[] = [];
let queueLoaded = false;
let isFlushing = false;
let sessionIdPromise: Promise<string> | null = null;

const resolveBaseUrl = (): string | null => {
  const value = getCurrentApiUrl() ?? API_BASE_URL;
  return value?.trim() || null;
};

const toSerializableValue = (value: unknown): unknown => {
  if (value == null) {
    return value;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => toSerializableValue(item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        toSerializableValue(nestedValue),
      ]),
    );
  }

  return String(value);
};

const sanitizeMetadata = (metadata: TelemetryMetadata): Record<string, unknown> | null => {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, toSerializableValue(value)]),
  );
};

const persistQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(TELEMETRY_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    logger.warn('[Telemetry] Failed to persist queue', error);
  }
};

const ensureQueueLoaded = async (): Promise<void> => {
  if (queueLoaded) {
    return;
  }

  try {
    const raw = await AsyncStorage.getItem(TELEMETRY_QUEUE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      queue = Array.isArray(parsed) ? (parsed as TelemetryEventRecord[]) : [];
    }
  } catch (error) {
    logger.warn('[Telemetry] Failed to load queue', error);
    queue = [];
  } finally {
    queueLoaded = true;
  }
};

const generateSessionId = (): string =>
  `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const ensureSessionId = async (): Promise<string> => {
  if (!sessionIdPromise) {
    sessionIdPromise = (async () => {
      try {
        const existing = await AsyncStorage.getItem(TELEMETRY_SESSION_KEY);
        if (existing && existing.trim().length > 0) {
          return existing;
        }
      } catch (error) {
        logger.warn('[Telemetry] Failed to read session id', error);
      }

      const nextSessionId = generateSessionId();
      try {
        await AsyncStorage.setItem(TELEMETRY_SESSION_KEY, nextSessionId);
      } catch (error) {
        logger.warn('[Telemetry] Failed to persist session id', error);
      }

      return nextSessionId;
    })();
  }

  return sessionIdPromise;
};

const normalizeEvent = async (
  event: TelemetryEventInput,
): Promise<TelemetryEventRecord> => ({
  name: event.name,
  category: event.category,
  occurredAt: event.occurredAt ?? new Date().toISOString(),
  screen: event.screen ?? null,
  flow: event.flow ?? null,
  step: event.step ?? null,
  status: event.status ?? null,
  sessionId: event.sessionId ?? (await ensureSessionId()),
  metadata: sanitizeMetadata(event.metadata),
});

const postBatch = async (events: TelemetryEventRecord[]): Promise<boolean> => {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    logger.warn('[Telemetry] Missing API base URL, queue retained');
    return false;
  }

  try {
    const response = await fetchWithAuthRetry(
      `${baseUrl.replace(/\/+$/, '')}/api/telemetry/events`,
      () => ({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ events }),
      }),
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      logger.warn('[Telemetry] Batch rejected', response.status, detail);
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('[Telemetry] Batch send failed', error);
    return false;
  }
};

export const flushTelemetryQueue = async (): Promise<boolean> => {
  await ensureQueueLoaded();

  if (isFlushing) {
    return false;
  }

  if (queue.length === 0) {
    return true;
  }

  isFlushing = true;
  try {
    while (queue.length > 0) {
      const batch = queue.slice(0, BATCH_SIZE);
      const sent = await postBatch(batch);
      if (!sent) {
        return false;
      }

      queue = queue.slice(batch.length);
      await persistQueue();
    }

    return true;
  } finally {
    isFlushing = false;
  }
};

export const trackTelemetryEvent = async (
  event: TelemetryEventInput,
): Promise<void> => {
  await ensureQueueLoaded();

  const normalized = await normalizeEvent(event);
  queue = [...queue, normalized].slice(-MAX_QUEUE_SIZE);
  await persistQueue();

  void flushTelemetryQueue();
};

export const trackTelemetryEvents = async (
  events: TelemetryEventInput[],
): Promise<void> => {
  await ensureQueueLoaded();

  const normalized = await Promise.all(events.map(normalizeEvent));
  queue = [...queue, ...normalized].slice(-MAX_QUEUE_SIZE);
  await persistQueue();

  void flushTelemetryQueue();
};

export const initTelemetryService = async (): Promise<void> => {
  await ensureQueueLoaded();
  await ensureSessionId();
  void flushTelemetryQueue();
};
