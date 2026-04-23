import {
  createNavigationContainerRef,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';

import type { RootStackParamList } from '../types';

type MaybeState = NavigationState | PartialState<NavigationState> | undefined;

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const getDeepestRouteName = (state: MaybeState): string | undefined => {
  if (!state || !Array.isArray(state.routes) || state.routes.length === 0) {
    return undefined;
  }

  const route = state.routes[state.index ?? state.routes.length - 1] as
    | (NavigationState['routes'][number] & { state?: MaybeState })
    | undefined;

  if (!route) {
    return undefined;
  }

  return getDeepestRouteName(route.state) ?? route.name;
};

export const getActiveRouteName = (): string | undefined => {
  if (!navigationRef.isReady()) {
    return undefined;
  }

  const rootState = navigationRef.getRootState();
  return getDeepestRouteName(rootState);
};

export const navigateToStatsWeeklyReview = (): boolean => {
  if (!navigationRef.isReady()) {
    return false;
  }

  navigationRef.navigate('AppTabs', {
    screen: 'StatsTab',
    params: {
      source: 'weekly-review',
      focusWeeklyReview: true,
    },
  } as never);

  return true;
};

export const navigateRoot = <T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T],
): boolean => {
  if (!navigationRef.isReady()) {
    return false;
  }

  (navigationRef.navigate as (...args: unknown[]) => void)(name, params);
  return true;
};
