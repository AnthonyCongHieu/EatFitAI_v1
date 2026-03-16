/**
 * Google OAuth configuration sourced from Expo public env vars.
 */

const normalizeClientId = (value: string | undefined): string => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.startsWith('YOUR_')) {
    return '';
  }

  return trimmed;
};

const readBooleanEnv = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  return value.trim().toLowerCase() === 'true';
};

export const GOOGLE_CONFIG = {
  webClientId: normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
  iosClientId: normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
  scopes: ['profile', 'email'],
  offlineAccess: readBooleanEnv(process.env.EXPO_PUBLIC_GOOGLE_OFFLINE_ACCESS, true),
  forceCodeForRefreshToken: readBooleanEnv(
    process.env.EXPO_PUBLIC_GOOGLE_FORCE_CODE_FOR_REFRESH_TOKEN,
    true,
  ),
};

/**
 * Validate Google config is set up correctly.
 */
export const validateGoogleConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!GOOGLE_CONFIG.webClientId) {
    errors.push(
      'Web Client ID chua duoc cau hinh. Hay set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID trong .env.development hoac environment.',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Google Cloud Console setup guide.
 */
export const GOOGLE_SETUP_GUIDE = `
1. Tao OAuth client IDs trong Google Cloud Console.
2. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID trong .env.development.
3. Neu can iOS-specific client ID, set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.
4. Rebuild app sau khi cap nhat credentials native.
`;

export default GOOGLE_CONFIG;
