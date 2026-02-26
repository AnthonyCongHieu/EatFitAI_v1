import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Import config Ä‘Æ°á»£c generate tá»± Ä‘á»™ng khi cháº¡y 'npm run start'
// File nÃ y chá»©a IP local Ä‘Æ°á»£c detect táº¡i thá»i Ä‘iá»ƒm Metro start
let GENERATED_API_BASE_URL: string | undefined;
try {
  // Dynamic import Ä‘á»ƒ trÃ¡nh lá»—i náº¿u file chÆ°a Ä‘Æ°á»£c generate
  const generatedConfig = require('./generated-api-config');
  GENERATED_API_BASE_URL = generatedConfig.GENERATED_API_BASE_URL;
  if (__DEV__ && GENERATED_API_BASE_URL) {
    console.log('[EatFitAI] Using generated API config:', GENERATED_API_BASE_URL);
  }
} catch {
  // File chÆ°a Ä‘Æ°á»£c generate - sáº½ dÃ¹ng fallback logic
  if (__DEV__) {
    console.log('[EatFitAI] generated-api-config.ts not found, using fallback detection');
  }
}

const normalizeUrl = (value: string | undefined | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveHostUri = (): string | undefined => {
  const expoConfig: any = Constants;

  // Thá»­ láº¥y tá»« nhiá»u nguá»“n khÃ¡c nhau - há»— trá»£ cáº£ Expo Go vÃ  Development Build
  const possibleSources: (string | undefined | null)[] = [
    // Expo SDK 49+ structure
    expoConfig?.expoConfig?.hostUri,
    // Expo Go specific
    expoConfig?.expoGoConfig?.hostUri,
    // manifest2 structure (OTA updates)
    expoConfig?.manifest2?.extra?.expoClient?.hostUri,
    // Classic manifest
    expoConfig?.manifest?.hostUri,
    expoConfig?.manifest?.debuggerHost,
    expoConfig?.manifest?.bundleUrl,
    // Development client specific
    expoConfig?.debuggerHost,
    // Fallback to experienceUrl
    expoConfig?.experienceUrl,
    expoConfig?.linkingUri,
  ];

  // Thá»­ láº¥y tá»« global Metro bundler URL (dev client specific)
  try {
    const g = globalThis as any;
    if (g?.__METRO_GLOBAL_PREFIX__) {
      possibleSources.push(g.__METRO_GLOBAL_PREFIX__);
    }
    if (g?.__DEV_SERVER_URL__) {
      possibleSources.push(g.__DEV_SERVER_URL__);
    }
  } catch {
    // globalThis khÃ´ng kháº£ dá»¥ng
  }

  // DEBUG: Log táº¥t cáº£ cÃ¡c nguá»“n cÃ³ thá»ƒ láº¥y hostUri
  if (__DEV__) {
    console.log('[EatFitAI] DEBUG Constants keys:', Object.keys(expoConfig || {}));
    console.log('[EatFitAI] DEBUG executionEnvironment:', expoConfig?.executionEnvironment);
    console.log('[EatFitAI] DEBUG expoConfig.hostUri:', expoConfig?.expoConfig?.hostUri);
    console.log('[EatFitAI] DEBUG expoGoConfig.hostUri:', expoConfig?.expoGoConfig?.hostUri);
    console.log('[EatFitAI] DEBUG manifest2.extra.expoClient.hostUri:', expoConfig?.manifest2?.extra?.expoClient?.hostUri);
    console.log('[EatFitAI] DEBUG manifest.hostUri:', expoConfig?.manifest?.hostUri);
    console.log('[EatFitAI] DEBUG manifest.debuggerHost:', expoConfig?.manifest?.debuggerHost);
    console.log('[EatFitAI] DEBUG manifest.bundleUrl:', expoConfig?.manifest?.bundleUrl);
    console.log('[EatFitAI] DEBUG debuggerHost:', expoConfig?.debuggerHost);
    console.log('[EatFitAI] DEBUG experienceUrl:', expoConfig?.experienceUrl);
    console.log('[EatFitAI] DEBUG linkingUri:', expoConfig?.linkingUri);
  }

  // TÃ¬m hostCandidate tá»« cÃ¡c nguá»“n
  let hostCandidate: string | undefined;
  for (const source of possibleSources) {
    const normalized = normalizeUrl(source);
    if (normalized) {
      hostCandidate = normalized;
      break;
    }
  }

  if (__DEV__) {
    console.log('[EatFitAI] DEBUG hostCandidate:', hostCandidate);
  }

  if (!hostCandidate) {
    return undefined;
  }

  // Bá» scheme vÃ  path náº¿u cÃ³ (vÃ­ dá»¥ exp://192.168.1.10:19000 hoáº·c http://192.168.1.10:8081)
  const withoutScheme = hostCandidate.split('://').pop() ?? hostCandidate;
  const withoutPathParts = withoutScheme.split('/');
  const hostWithPort = withoutPathParts.length > 0 ? withoutPathParts[0] : undefined;
  if (!hostWithPort) {
    return undefined;
  }

  const hostParts = hostWithPort.split(':');
  const host = hostParts.length > 0 ? hostParts[0] : undefined;
  return host && host.length > 0 ? host : undefined;
};

const resolveScheme = (): 'http' | 'https' => {
  const envScheme = normalizeUrl(process.env.EXPO_PUBLIC_API_SCHEME);
  return envScheme === 'https' ? 'https' : 'http';
};

const resolvePort = (): string | undefined =>
  normalizeUrl(process.env.EXPO_PUBLIC_API_PORT);

export const API_BASE_URL: string | undefined = (() => {
  // 1. Æ¯u tiÃªn cao nháº¥t: Biáº¿n mÃ´i trÆ°á»ng EXPO_PUBLIC_API_BASE_URL
  const explicit = normalizeUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (explicit) {
    return explicit;
  }

  // 2. Æ¯u tiÃªn thá»© 2: Generated config tá»« script pre-start (Ä‘Ã¡ng tin cáº­y nháº¥t)
  if (GENERATED_API_BASE_URL) {
    return GENERATED_API_BASE_URL;
  }

  // 2. Tá»« app.config.js extra (auto-detected IP khi Metro start)
  // Thá»­ nhiá»u Ä‘Æ°á»ng dáº«n khÃ¡c nhau vÃ¬ Expo tráº£ vá» cáº¥u trÃºc khÃ¡c nhau tÃ¹y context
  const expoConfig: any = Constants;
  const possibleExtras = [
    expoConfig?.expoConfig?.extra?.apiBaseUrl,
    expoConfig?.manifest?.extra?.apiBaseUrl,
    expoConfig?.manifest2?.extra?.expoClient?.extra?.apiBaseUrl,
    expoConfig?.manifest2?.extra?.expoGo?.extra?.apiBaseUrl,
  ];

  if (__DEV__) {
    console.log('[EatFitAI] DEBUG - Looking for apiBaseUrl in extra:');
    console.log('  expoConfig.extra:', expoConfig?.expoConfig?.extra);
    console.log('  manifest.extra:', expoConfig?.manifest?.extra);
    console.log('  manifest2.extra.expoClient.extra:', expoConfig?.manifest2?.extra?.expoClient?.extra);
  }

  for (const extraUrl of possibleExtras) {
    const fromExtra = normalizeUrl(extraUrl);
    if (fromExtra) {
      if (__DEV__) {
        console.log('[EatFitAI] Using API URL from app.config.js extra:', fromExtra);
      }
      return fromExtra;
    }
  }

  let host = resolveHostUri();
  if (!host) {
    if (Platform.OS === 'web') {
      host = 'localhost';
    } else if (!__DEV__) {
      // Production build: require explicit API base URL/config, do not guess LAN IP.
      return undefined;
    } else {
      // Fallback cho physical device khi khong detect duoc IP
      const FALLBACK_IP = '172.16.3.206';
      console.warn(`[EatFitAI] Auto-detect failed, using fallback IP: ${FALLBACK_IP}`);
      host = FALLBACK_IP;
    }
  }
// Android emulator can't reach host via localhost/127.0.0.1 -> use 10.0.2.2
  if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
    host = '10.0.2.2';
  }

  // Default dev API port simplified to match backend launch profile
  const port = resolvePort() ?? '5247';
  const scheme = resolveScheme();
  return `${scheme}://${host}:${port}`;
})();

if (__DEV__) {
  if (!API_BASE_URL) {
    console.error('[EatFitAI] CRITICAL ERROR: API_BASE_URL is undefined!');
    console.error(
      '[EatFitAI] This will cause all API requests to fail with "undefined Network Error".',
    );
    console.error('[EatFitAI] Solutions:');
    console.error('[EatFitAI] 1. Set EXPO_PUBLIC_API_BASE_URL environment variable');
    console.error(
      '[EatFitAI] 2. Ensure Expo development server is running and accessible',
    );
    console.error('[EatFitAI] 3. Check network connectivity to backend server');
  } else {
    console.log(`[EatFitAI] API_BASE_URL resolved to: ${API_BASE_URL}`);
  }
}

