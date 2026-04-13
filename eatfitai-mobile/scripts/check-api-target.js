const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '10.0.2.2']);

function isPrivateIpv4Host(host) {
  return (
    /^10\./.test(host) ||
    /^127\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function isLocalLikeHost(host) {
  const normalizedHost = String(host || '')
    .trim()
    .toLowerCase();
  return (
    LOCAL_HOSTS.has(normalizedHost) ||
    normalizedHost.endsWith('.local') ||
    isPrivateIpv4Host(normalizedHost)
  );
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  const rawBaseUrl = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
  if (!rawBaseUrl) {
    console.warn(
      '[api-target] EXPO_PUBLIC_API_BASE_URL is not set. Skipping backend health check.',
    );
    return;
  }

  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(rawBaseUrl);
  } catch (error) {
    console.error(`[api-target] Invalid EXPO_PUBLIC_API_BASE_URL: ${rawBaseUrl}`);
    process.exit(1);
  }

  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const localLike = isLocalLikeHost(parsedBaseUrl.hostname);
  const healthUrls = [`${baseUrl}/health/ready`, `${baseUrl}/health/live`];

  console.log(`[api-target] API target: ${baseUrl}`);
  console.log(`[api-target] Mode: ${localLike ? 'local-or-lan' : 'cloud'}`);

  const attempts = localLike ? 1 : 3;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    for (const healthUrl of healthUrls) {
      try {
        const response = await fetchWithTimeout(healthUrl, localLike ? 5000 : 15000);
        if (response.ok) {
          console.log(`[api-target] OK ${healthUrl} -> HTTP ${response.status}`);
          return;
        }

        const responseText = await response.text();
        lastError = new Error(
          `HTTP ${response.status}${responseText ? ` ${responseText}` : ''}`,
        );
      } catch (error) {
        lastError = error;
      }
    }

    if (!localLike && attempt < attempts) {
      console.log(
        `[api-target] Cloud backend is not ready yet. Waiting before retry ${attempt + 1}/${attempts}...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  const detail =
    lastError instanceof Error
      ? lastError.message
      : 'Unknown backend health check failure';

  if (localLike) {
    console.warn(
      `[api-target] Local backend is not reachable yet (${detail}). Expo will still start so UI-only work can continue.`,
    );
    return;
  }

  console.warn(
    `[api-target] Cloud backend is still sleeping or unavailable (${detail}). Expo will continue and the first API request may need extra time to wake Render.`,
  );
}

main().catch((error) => {
  console.error('[api-target] Unexpected error:', error);
  process.exit(1);
});
