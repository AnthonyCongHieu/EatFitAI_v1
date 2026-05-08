export const TELEMETRY_EVENTS = {
  funnelStarted: 'funnel_started',
  funnelCompleted: 'funnel_completed',
  aiScanStarted: 'ai_scan_started',
  aiScanResult: 'ai_scan_result',
  aiScanSaved: 'ai_scan_saved',
  notificationDecision: 'notification_decision',
  notificationTapped: 'notification_tapped',
  completeDayAchieved: 'complete_day_achieved',
} as const;

export const TELEMETRY_CATEGORIES = {
  funnel: 'funnel',
  aiScan: 'ai_scan',
  notification: 'notification',
  diary: 'diary',
} as const;
