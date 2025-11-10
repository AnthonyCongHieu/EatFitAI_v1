import Constants from 'expo-constants';
import { Platform } from 'react-native';

const normalizeUrl = (value: string | undefined | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveHostUri = (): string | undefined => {
  const expoConfig: any = Constants;

  const hostCandidate =
    normalizeUrl(expoConfig?.expoConfig?.hostUri) ??
    normalizeUrl(expoConfig?.expoGoConfig?.hostUri) ??
    normalizeUrl(expoConfig?.manifest2?.extra?.expoClient?.hostUri) ??
    normalizeUrl(expoConfig?.manifest?.hostUri) ??
    normalizeUrl(expoConfig?.manifest?.debuggerHost) ??
    normalizeUrl(expoConfig?.manifest?.bundleUrl);

  if (!hostCandidate) {
    return undefined;
  }

  // Bỏ scheme và path nếu có (ví dụ exp://192.168.1.10:19000)
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

const resolvePort = (): string | undefined => normalizeUrl(process.env.EXPO_PUBLIC_API_PORT);

export const API_BASE_URL: string | undefined = (() => {
  const explicit = normalizeUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (explicit) {
    return explicit;
  }

  let host = resolveHostUri();
  if (!host) {
    return undefined;
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
    // eslint-disable-next-line no-console
    console.error(
      '[EatFitAI] CRITICAL ERROR: API_BASE_URL is undefined!',
    );
    console.error('[EatFitAI] This will cause all API requests to fail with "undefined Network Error".');
    console.error('[EatFitAI] Solutions:');
    console.error('[EatFitAI] 1. Set EXPO_PUBLIC_API_BASE_URL environment variable');
    console.error('[EatFitAI] 2. Ensure Expo development server is running and accessible');
    console.error('[EatFitAI] 3. Check network connectivity to backend server');
  } else {
    // eslint-disable-next-line no-console
    console.log(`[EatFitAI] API_BASE_URL resolved to: ${API_BASE_URL}`);
  }
}
