import {
  initTelemetryService,
  trackTelemetryEvent,
  type TelemetryMetadata,
} from './telemetryService';

type AnalyticsParams = Record<string, unknown>;

type TelemetryParams = {
  category?: string;
  flow?: string;
  step?: string;
  status?: string;
  screen?: string;
  metadata?: TelemetryMetadata;
};

const normalizeTelemetryParams = (
  params?: AnalyticsParams,
): Required<Omit<TelemetryParams, 'metadata'>> & { metadata: TelemetryMetadata } => {
  const {
    category = 'product',
    flow = '',
    step = '',
    status = '',
    screen = '',
    metadata,
    ...rest
  } = (params ?? {}) as AnalyticsParams & TelemetryParams;

  return {
    category,
    flow,
    step,
    status,
    screen,
    metadata: metadata ?? rest,
  };
};

export const initAnalytics = async (): Promise<void> => {
  await initTelemetryService();
};

export const trackScreen = (screen: string, params?: AnalyticsParams): void => {
  const telemetry = normalizeTelemetryParams(params);
  void trackTelemetryEvent({
    name: 'screen_view',
    category: 'screen_view',
    screen,
    flow: telemetry.flow || 'navigation',
    step: telemetry.step || screen,
    status: telemetry.status || 'viewed',
    metadata: telemetry.metadata,
  });
};

export const trackEvent = (event: string, params?: AnalyticsParams): void => {
  const telemetry = normalizeTelemetryParams(params);
  void trackTelemetryEvent({
    name: event,
    category: telemetry.category,
    screen: telemetry.screen || undefined,
    flow: telemetry.flow || undefined,
    step: telemetry.step || undefined,
    status: telemetry.status || undefined,
    metadata: telemetry.metadata,
  });
};
