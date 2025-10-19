import Constants from 'expo-constants';

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

  const host = resolveHostUri();
  if (!host) {
    return undefined;
  }

  const port = resolvePort() ?? '5100';
  const scheme = resolveScheme();
  return `${scheme}://${host}:${port}`;
})();

if (__DEV__ && !API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    '[EatFitAI] API base URL chưa được cấu hình. Vui lòng đặt EXPO_PUBLIC_API_BASE_URL hoặc đảm bảo Expo hostUri khả dụng.',
  );
}
