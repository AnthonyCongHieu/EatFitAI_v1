import logger from '../utils/logger';
import { initTelemetryService, trackTelemetryEvent } from './telemetryService';

const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    return error as Record<string, unknown>;
  }

  return {
    message: typeof error === 'string' ? error : String(error),
  };
};

export const initErrorTracking = async (): Promise<void> => {
  await initTelemetryService();
};

export const captureError = (
  error: unknown,
  context?: string,
  extras?: Record<string, unknown>,
): void => {
  logger.error('[ErrorTracking]', context ?? 'App', error);

  void trackTelemetryEvent({
    name: 'mobile_runtime_error',
    category: 'error',
    flow: 'runtime',
    step: context ?? 'app',
    status: 'failure',
    metadata: {
      context: context ?? 'App',
      ...serializeError(error),
      ...extras,
    },
  });
};
