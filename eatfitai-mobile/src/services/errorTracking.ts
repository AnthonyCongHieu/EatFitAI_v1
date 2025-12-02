// Minimal error tracking stub (replace with Sentry or similar)

export const initErrorTracking = async (): Promise<void> => {
  // TODO: integrate real error tracking SDK
};

export const captureError = (error: unknown, context?: string): void => {
  if (__DEV__) {
    console.error('[ErrorTracking]', context ?? 'App', error);
  }
  // TODO: forward to monitoring service
};
