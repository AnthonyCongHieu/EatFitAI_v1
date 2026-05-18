import AsyncStorage from '@react-native-async-storage/async-storage';

import { MOCHI_TUTORIAL_VERSION } from './mochiTutorialCatalog';

export const MOCHI_TUTORIAL_STATUS_KEY = '@eatfitai_mochi_tutorial_v1';
export const MOCHI_TUTORIAL_PENDING_KEY = '@eatfitai_mochi_tutorial_pending_v1';

export type MoChiTutorialStoredStatus = {
  version: number;
  status: 'completed' | 'skipped';
  updatedAt: string;
};

const createStatus = (
  status: MoChiTutorialStoredStatus['status'],
): MoChiTutorialStoredStatus => ({
  version: MOCHI_TUTORIAL_VERSION,
  status,
  updatedAt: new Date().toISOString(),
});

export const getMoChiTutorialStatus = async (): Promise<MoChiTutorialStoredStatus | null> => {
  const raw = await AsyncStorage.getItem(MOCHI_TUTORIAL_STATUS_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MoChiTutorialStoredStatus>;
    if (
      parsed.version !== MOCHI_TUTORIAL_VERSION
      || (parsed.status !== 'completed' && parsed.status !== 'skipped')
      || typeof parsed.updatedAt !== 'string'
    ) {
      return null;
    }

    return {
      version: parsed.version,
      status: parsed.status,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
};

export const markMoChiTutorialPending = async (): Promise<void> => {
  await AsyncStorage.setItem(MOCHI_TUTORIAL_PENDING_KEY, 'true');
};

export const clearMoChiTutorialPending = async (): Promise<void> => {
  await AsyncStorage.removeItem(MOCHI_TUTORIAL_PENDING_KEY);
};

export const shouldAutoStartMoChiTutorial = async (): Promise<boolean> => {
  const [pending, status] = await Promise.all([
    AsyncStorage.getItem(MOCHI_TUTORIAL_PENDING_KEY),
    getMoChiTutorialStatus(),
  ]);

  return pending === 'true' && status === null;
};

export const markMoChiTutorialCompleted = async (): Promise<void> => {
  await AsyncStorage.multiSet([
    [MOCHI_TUTORIAL_STATUS_KEY, JSON.stringify(createStatus('completed'))],
  ]);
  await clearMoChiTutorialPending();
};

export const markMoChiTutorialSkipped = async (): Promise<void> => {
  await AsyncStorage.multiSet([
    [MOCHI_TUTORIAL_STATUS_KEY, JSON.stringify(createStatus('skipped'))],
  ]);
  await clearMoChiTutorialPending();
};

export const resetMoChiTutorialForReplay = async (): Promise<void> => {
  await AsyncStorage.multiRemove([
    MOCHI_TUTORIAL_STATUS_KEY,
    MOCHI_TUTORIAL_PENDING_KEY,
  ]);
};
