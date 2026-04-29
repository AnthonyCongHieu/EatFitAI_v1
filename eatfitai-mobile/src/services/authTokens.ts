import logger from '../utils/logger';

let accessTokenMem: string | null = null;

export const setAccessTokenMem = (token: string | null): void => {
  // Validate token before setting
  if (token !== null && (typeof token !== 'string' || token.trim().length === 0)) {
    logger.warn('[EatFitAI] Attempted to set invalid access token, ignoring');
    return;
  }
  if (__DEV__) {
    logger.info('[EatFitAI] Setting access token in memory:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenPrefix: token ? token.substring(0, 20) + '...' : null,
    });
  }
  accessTokenMem = token;
};

export const getAccessTokenMem = (): string | null => {
  if (__DEV__) {
    logger.info('[EatFitAI] Getting access token from memory:', {
      hasToken: !!accessTokenMem,
      tokenLength: accessTokenMem ? accessTokenMem.length : 0,
    });
  }
  return accessTokenMem;
};

export const clearAccessTokenMem = (): void => {
  if (__DEV__) {
    logger.info('[EatFitAI] Clearing access token from memory');
  }
  accessTokenMem = null;
};
