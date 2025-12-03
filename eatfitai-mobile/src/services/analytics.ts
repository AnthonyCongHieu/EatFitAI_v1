// Minimal analytics stub (replace with Firebase/Amplitude when available)

type AnalyticsParams = Record<string, any>;

export const initAnalytics = async (): Promise<void> => {
  // TODO: integrate real analytics SDK
};

export const trackScreen = (screen: string, params?: AnalyticsParams): void => {
  if (__DEV__) {
    console.log('[Analytics] Screen', screen, params);
  }
};

export const trackEvent = (event: string, params?: AnalyticsParams): void => {
  if (__DEV__) {
    console.log('[Analytics] Event', event, params);
  }
};
