import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Import config generated automatically when 'npm run start' runs
// This file stores the detected local IP at Metro startup time
let GENERATED_API_BASE_URL: string | undefined;
try {
  // Dynamic import avoids errors when the generated file does not exist yet
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const generatedConfig = require('./generated-api-config');
  GENERATED_API_BASE_URL = generatedConfig.GENERATED_API_BASE_URL;
  if (__DEV__ && GENERATED_API_BASE_URL) {
    console.log('[EatFitAI] Using generated API config:', GENERATED_API_BASE_URL);
  }
} catch {
  // Generated file is missing; fall back to runtime detection
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

const isAiProviderPort = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.port === '5050';
  } catch {
    return /:5050(?:\/|$)/.test(value);
  }
};

const toSafeBackendApiUrl = (
  value: string | undefined | null,
  source: string,
): string | undefined => {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return undefined;
  }

  if (!isAiProviderPort(normalized)) {
    return normalized;
  }

  console.error(
    `[EatFitAI] ${source} points to AI provider port 5050. Mobile must call the backend proxy instead.`,
  );
  return undefined;
};

export const assertBackendApiBaseUrl = (
  value: string | undefined | null,
  source: string,
): string => {
  const safeUrl = toSafeBackendApiUrl(value, source);
  if (!safeUrl) {
    throw new Error(
      `${source} is not configured to a backend URL. Use the backend API lane instead of the AI provider.`,
    );
  }

  return safeUrl;
};

const resolveHostUri = (): string | undefined => {
  const expoConfig: any = Constants;

  // Try multiple sources so this works in both Expo Go and development builds
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

  // Try the global Metro bundler URL as an additional dev-client source
  try {
    const g = globalThis as any;
    if (g?.__METRO_GLOBAL_PREFIX__) {
      possibleSources.push(g.__METRO_GLOBAL_PREFIX__);
    }
    if (g?.__DEV_SERVER_URL__) {
      possibleSources.push(g.__DEV_SERVER_URL__);
    }
  } catch {
    // globalThis is not available
  }

  // DEBUG: log every source that might contain a host URI
  if (__DEV__) {
    console.log('[EatFitAI] DEBUG Constants keys:', Object.keys(expoConfig || {}));
    console.log(
      '[EatFitAI] DEBUG executionEnvironment:',
      expoConfig?.executionEnvironment,
    );
    console.log('[EatFitAI] DEBUG expoConfig.hostUri:', expoConfig?.expoConfig?.hostUri);
    console.log(
      '[EatFitAI] DEBUG expoGoConfig.hostUri:',
      expoConfig?.expoGoConfig?.hostUri,
    );
    console.log(
      '[EatFitAI] DEBUG manifest2.extra.expoClient.hostUri:',
      expoConfig?.manifest2?.extra?.expoClient?.hostUri,
    );
    console.log('[EatFitAI] DEBUG manifest.hostUri:', expoConfig?.manifest?.hostUri);
    console.log(
      '[EatFitAI] DEBUG manifest.debuggerHost:',
      expoConfig?.manifest?.debuggerHost,
    );
    console.log('[EatFitAI] DEBUG manifest.bundleUrl:', expoConfig?.manifest?.bundleUrl);
    console.log('[EatFitAI] DEBUG debuggerHost:', expoConfig?.debuggerHost);
    console.log('[EatFitAI] DEBUG experienceUrl:', expoConfig?.experienceUrl);
    console.log('[EatFitAI] DEBUG linkingUri:', expoConfig?.linkingUri);
  }

  // Find the first usable host candidate
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

  // Remove scheme and path if present (for example exp://192.168.1.10:19000)
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

const resolveDevFallbackHost = (): string | undefined => {
  const explicitFallbackHost = normalizeUrl(process.env.EXPO_PUBLIC_API_FALLBACK_HOST);
  if (explicitFallbackHost) {
    return explicitFallbackHost;
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  if (Platform.OS === 'ios' || Platform.OS === 'web') {
    return 'localhost';
  }

  return undefined;
};

export const API_BASE_URL: string | undefined = (() => {
  // 1. Highest priority: EXPO_PUBLIC_API_BASE_URL environment variable
  const explicit = toSafeBackendApiUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL,
    'EXPO_PUBLIC_API_BASE_URL',
  );
  if (explicit) {
    return explicit;
  }

  // 2. Next priority: generated config from the pre-start script
  if (GENERATED_API_BASE_URL) {
    const generated = toSafeBackendApiUrl(
      GENERATED_API_BASE_URL,
      'generated API base URL',
    );
    if (generated) {
      return generated;
    }
  }

  // 3. app.config.js extra values (auto-detected IP when Metro starts)
  // Try multiple paths because Expo returns different structures by context
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
    console.log(
      '  manifest2.extra.expoClient.extra:',
      expoConfig?.manifest2?.extra?.expoClient?.extra,
    );
  }

  for (const extraUrl of possibleExtras) {
    const fromExtra = toSafeBackendApiUrl(extraUrl, 'Expo extra apiBaseUrl');
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
      const fallbackHost = resolveDevFallbackHost();
      if (!fallbackHost) {
        console.warn(
          '[EatFitAI] Auto-detect failed and no safe fallback host is configured.',
        );
        return undefined;
      }

      console.warn(`[EatFitAI] Auto-detect failed, using fallback host: ${fallbackHost}`);
      host = fallbackHost;
    }
  }
  // Android emulator can't reach host via localhost/127.0.0.1 -> use 10.0.2.2
  if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
    host = '10.0.2.2';
  }

  // Default dev API port simplified to match backend launch profile
  const port = resolvePort() ?? '5247';
  const scheme = resolveScheme();
  return toSafeBackendApiUrl(`${scheme}://${host}:${port}`, 'resolved API base URL');
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
