import { API_BASE_URL } from '../config/env';
import apiClient, { getCurrentApiUrl } from './apiClient';

export type HealthStatus = {
  ok: boolean;
  detail?: string;
};

type WarmUpOptions = {
  maxAttempts?: number;
  delayMs?: number;
  timeoutMs?: number;
  force?: boolean;
};

const CLOUD_WARMUP_CACHE_MS = 60000;

let warmUpPromise: Promise<HealthStatus> | null = null;
let lastWarmUpSuccessAt = 0;

const isPrivateIpv4Host = (host: string): boolean =>
  /^10\./.test(host) ||
  /^127\./.test(host) ||
  /^192\.168\./.test(host) ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

const isCloudBackendTarget = (): boolean => {
  const baseUrl = getCurrentApiUrl() ?? API_BASE_URL;
  if (!baseUrl) {
    return false;
  }

  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return !(
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '10.0.2.2' ||
      host.endsWith('.local') ||
      isPrivateIpv4Host(host)
    );
  } catch {
    return false;
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const requestHealth = async (
  paths: string[],
  timeoutMs = 10000,
): Promise<HealthStatus> => {
  let lastDetail = 'Unknown health check error';

  for (const path of paths) {
    try {
      await apiClient.get(path, { timeout: timeoutMs });
      return { ok: true };
    } catch (error: any) {
      lastDetail = error?.message || lastDetail;
    }
  }

  return { ok: false, detail: lastDetail };
};

const warmUpInternal = async ({
  maxAttempts = 3,
  delayMs = 5000,
  timeoutMs = 15000,
}: WarmUpOptions = {}): Promise<HealthStatus> => {
  let lastFailure: HealthStatus = { ok: false, detail: 'Backend warm-up failed' };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const live = await requestHealth(['/health/live', '/api/Health/live'], timeoutMs);
    if (live.ok) {
      const ready = await requestHealth(
        ['/health/ready', '/api/Health/ready'],
        timeoutMs,
      );
      if (ready.ok) {
        lastWarmUpSuccessAt = Date.now();
        return ready;
      }
      lastFailure = ready;
    } else {
      lastFailure = live;
    }

    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }

  return lastFailure;
};

export const healthService = {
  async pingLive(timeoutMs?: number): Promise<HealthStatus> {
    return requestHealth(['/health/live', '/api/Health/live'], timeoutMs);
  },

  async pingReady(timeoutMs?: number): Promise<HealthStatus> {
    return requestHealth(['/health/ready', '/api/Health/ready'], timeoutMs);
  },

  async pingRoot(timeoutMs?: number): Promise<HealthStatus> {
    return requestHealth(
      ['/health/live', '/api/Health/live', '/health/ready', '/api/Health/ready'],
      timeoutMs,
    );
  },

  async warmUpBackend(options: WarmUpOptions = {}): Promise<HealthStatus> {
    const { force = false } = options;

    if (!force && !isCloudBackendTarget()) {
      return requestHealth(
        ['/health/live', '/api/Health/live', '/health/ready', '/api/Health/ready'],
        options.timeoutMs,
      );
    }

    if (
      !force &&
      lastWarmUpSuccessAt > 0 &&
      Date.now() - lastWarmUpSuccessAt < CLOUD_WARMUP_CACHE_MS
    ) {
      return { ok: true };
    }

    if (!force && warmUpPromise) {
      return warmUpPromise;
    }

    const run = warmUpInternal(options).finally(() => {
      warmUpPromise = null;
    });

    warmUpPromise = run;
    return run;
  },
};
