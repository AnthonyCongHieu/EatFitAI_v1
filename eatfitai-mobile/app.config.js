const os = require('os');

function readTrimmedEnv(name) {
  const value = process.env[name];
  return value ? value.trim() : '';
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;

    const lowerName = name.toLowerCase();
    if (
      lowerName.includes('docker') ||
      lowerName.includes('veth') ||
      lowerName.includes('vbox') ||
      lowerName.includes('vmware') ||
      lowerName.includes('hyper-v') ||
      lowerName.includes('wsl')
    ) {
      continue;
    }

    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        candidates.push({
          name,
          address: addr.address,
          priority:
            lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wlan')
              ? 1
              : lowerName.includes('ethernet') || lowerName.includes('eth')
                ? 2
                : 3,
        });
      }
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);

  if (candidates.length > 0) {
    console.log(`[app.config.js] Auto-detected IP: ${candidates[0].address} (${candidates[0].name})`);
    return candidates[0].address;
  }

  console.warn('[app.config.js] Could not auto-detect IP, falling back to localhost');
  return 'localhost';
}

function isProductionLikeBuild(profile) {
  return ['production', 'preview', 'staging'].includes(profile);
}

function assertRequiredProductionEnv(name, value) {
  if (!value || value.startsWith('YOUR_')) {
    throw new Error(`[app.config.js] ${name} is required for production-like builds.`);
  }
}

module.exports = ({ config }) => {
  const existingExtra = config.extra || {};
  const existingEas = existingExtra.eas || {};
  const easProjectId =
    process.env.EXPO_EAS_PROJECT_ID ||
    process.env.EAS_PROJECT_ID ||
    existingEas.projectId;

  const appProfile =
    readTrimmedEnv('APP_ENV') ||
    readTrimmedEnv('EAS_BUILD_PROFILE') ||
    readTrimmedEnv('NODE_ENV') ||
    'development';
  const explicitApiBaseUrl = readTrimmedEnv('EXPO_PUBLIC_API_BASE_URL');
  const explicitSupabaseUrl = readTrimmedEnv('EXPO_PUBLIC_SUPABASE_URL');
  const fallbackApiPort = readTrimmedEnv('EXPO_PUBLIC_API_PORT') || '5247';
  const fallbackApiScheme = readTrimmedEnv('EXPO_PUBLIC_API_SCHEME') || 'http';
  const e2eAutomation = readTrimmedEnv('EXPO_PUBLIC_E2E_AUTOMATION') || '0';
  const productionLike = isProductionLikeBuild(appProfile);

  if (productionLike) {
    assertRequiredProductionEnv('EXPO_PUBLIC_API_BASE_URL', explicitApiBaseUrl);
    assertRequiredProductionEnv('EXPO_PUBLIC_SUPABASE_URL', explicitSupabaseUrl);
    assertRequiredProductionEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', readTrimmedEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'));
    assertRequiredProductionEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', readTrimmedEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'));
  }

  const localIp = productionLike ? '' : getLocalIpAddress();
  const apiBaseUrl =
    explicitApiBaseUrl || (!productionLike ? `${fallbackApiScheme}://${localIp}:${fallbackApiPort}` : '');

  let resolvedApiHost = localIp;
  let resolvedApiPort = fallbackApiPort;
  let resolvedApiScheme = fallbackApiScheme;

  if (apiBaseUrl) {
    const parsedUrl = new URL(apiBaseUrl);
    resolvedApiHost = parsedUrl.hostname;
    resolvedApiPort =
      parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : parsedUrl.protocol === 'http:' ? '80' : '');
    resolvedApiScheme = parsedUrl.protocol.replace(':', '');
  }

  console.log(`[app.config.js] APP_ENV=${appProfile}`);
  console.log(`[app.config.js] API_BASE_URL will be: ${apiBaseUrl || '<unset>'}`);

  return {
    ...config,
    extra: {
      ...existingExtra,
      eas: {
        ...existingEas,
        projectId: easProjectId,
      },
      apiHost: resolvedApiHost || undefined,
      apiPort: resolvedApiPort || undefined,
      apiScheme: resolvedApiScheme || undefined,
      apiBaseUrl: apiBaseUrl || undefined,
      supabaseUrl: explicitSupabaseUrl || undefined,
      appEnv: appProfile,
      e2eAutomation,
    },
  };
};
