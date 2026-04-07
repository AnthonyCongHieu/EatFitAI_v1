import Constants from 'expo-constants';

const isTruthyFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return false;
};

const resolveAutomationFlag = (): boolean => {
  const constants = Constants as any;
  const candidates: unknown[] = [
    process.env.EXPO_PUBLIC_E2E_AUTOMATION,
    constants?.expoConfig?.extra?.e2eAutomation,
    constants?.manifest?.extra?.e2eAutomation,
    constants?.manifest2?.extra?.expoClient?.extra?.e2eAutomation,
  ];

  return candidates.some(isTruthyFlag);
};

export const E2E_AUTOMATION_ENABLED = resolveAutomationFlag();
