const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const appConfigPath = path.join(mobileRoot, 'app.config.js');
const appJsonPath = path.join(mobileRoot, 'app.json');
const easJsonPath = path.join(mobileRoot, 'eas.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertCloudUrl(name, value) {
  assert(value, `${name} must be defined in eas.json for release builds`);

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
  assert(parsed.protocol === 'https:', `${name} must use https for release builds`);
  assert(!localHosts.has(parsed.hostname), `${name} must not point at a local host`);
  assert(!parsed.hostname.endsWith('.invalid'), `${name} must not use a placeholder host`);
}

function resolveProfileEnv(buildProfiles, profileName, visited = []) {
  if (visited.includes(profileName)) {
    throw new Error(`Circular EAS profile inheritance detected: ${[...visited, profileName].join(' -> ')}`);
  }

  const profile = buildProfiles[profileName];
  assert(profile, `Missing EAS build profile: ${profileName}`);

  const inherited = profile.extends
    ? resolveProfileEnv(buildProfiles, profile.extends, [...visited, profileName])
    : {};

  return {
    ...inherited,
    ...(profile.env || {}),
  };
}

function withEnv(overrides, run) {
  const previous = new Map();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function resolveAppConfig(appConfig, appExpoConfig, envOverrides) {
  return withEnv(envOverrides, () => appConfig({ config: appExpoConfig }));
}

function main() {
  const appJson = readJson(appJsonPath);
  const easJson = readJson(easJsonPath);
  const appConfig = require(appConfigPath);
  const buildProfiles = easJson.build || {};
  const expoConfig = appJson.expo || {};
  const expectedProjectId = expoConfig.extra?.eas?.projectId;

  assert(buildProfiles['release-base'], 'Missing EAS build profile: release-base');
  assert(buildProfiles.preview, 'Missing EAS build profile: preview');
  assert(buildProfiles.production, 'Missing EAS build profile: production');
  assert(buildProfiles['e2e-test'], 'Missing EAS build profile: e2e-test');

  assert(
    buildProfiles.preview.extends === 'release-base',
    'preview must extend release-base',
  );
  assert(
    buildProfiles.production.extends === 'release-base',
    'production must extend release-base',
  );
  assert(
    buildProfiles['e2e-test'].extends === 'preview',
    'e2e-test must extend preview',
  );

  const releaseBaseEnv = resolveProfileEnv(buildProfiles, 'release-base');
  const previewEnv = resolveProfileEnv(buildProfiles, 'preview');
  const productionEnv = resolveProfileEnv(buildProfiles, 'production');
  const e2eTestEnv = resolveProfileEnv(buildProfiles, 'e2e-test');

  assert(releaseBaseEnv.NODE_ENV === 'production', 'release-base must set NODE_ENV=production');
  assert(previewEnv.NODE_ENV === 'production', 'preview must inherit NODE_ENV=production');
  assert(productionEnv.NODE_ENV === 'production', 'production must inherit NODE_ENV=production');
  assert(previewEnv.APP_ENV === 'preview', 'preview must set APP_ENV=preview');
  assert(productionEnv.APP_ENV === 'production', 'production must set APP_ENV=production');
  assert(e2eTestEnv.APP_ENV === 'preview', 'e2e-test must inherit APP_ENV=preview');
  assertCloudUrl('preview EXPO_PUBLIC_API_BASE_URL', previewEnv.EXPO_PUBLIC_API_BASE_URL);
  assertCloudUrl('preview EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL', previewEnv.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL);
  assertCloudUrl('production EXPO_PUBLIC_API_BASE_URL', productionEnv.EXPO_PUBLIC_API_BASE_URL);
  assertCloudUrl('production EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL', productionEnv.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL);
  assert(
    buildProfiles.preview.android?.buildType === 'apk',
    'preview must keep android.buildType=apk',
  );
  assert(
    buildProfiles['e2e-test'].ios?.simulator === true,
    'e2e-test must keep ios.simulator=true',
  );

  const previewResolved = resolveAppConfig(appConfig, expoConfig, {
    NODE_ENV: previewEnv.NODE_ENV,
    EAS_BUILD_PROFILE: 'preview',
    EAS_BUILD_PLATFORM: 'android',
    APP_ENV: previewEnv.APP_ENV,
    EXPO_PUBLIC_API_BASE_URL: previewEnv.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL: previewEnv.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'ci-preview-web-client-id',
  });

  assert(previewResolved.extra?.appEnv === 'preview', 'preview app.config.js must resolve appEnv=preview');
  assert(
    previewResolved.extra?.apiBaseUrl === previewEnv.EXPO_PUBLIC_API_BASE_URL,
    'preview app.config.js must resolve API base URL from eas.json',
  );
  assert(
    previewResolved.extra?.mediaPublicBaseUrl === previewEnv.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL,
    'preview app.config.js must resolve media public base URL from eas.json',
  );
  assert(
    previewResolved.extra?.eas?.projectId === expectedProjectId,
    'preview app.config.js must preserve Expo projectId',
  );

  const productionResolved = resolveAppConfig(appConfig, expoConfig, {
    NODE_ENV: productionEnv.NODE_ENV,
    EAS_BUILD_PROFILE: 'production',
    EAS_BUILD_PLATFORM: 'android',
    APP_ENV: productionEnv.APP_ENV,
    EXPO_PUBLIC_API_BASE_URL: productionEnv.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL: productionEnv.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'ci-production-web-client-id',
  });

  assert(
    productionResolved.extra?.appEnv === 'production',
    'production app.config.js must resolve appEnv=production',
  );
  assert(
    productionResolved.extra?.apiBaseUrl === productionEnv.EXPO_PUBLIC_API_BASE_URL,
    'production app.config.js must resolve API base URL from eas.json',
  );
  assert(
    productionResolved.extra?.mediaPublicBaseUrl === productionEnv.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL,
    'production app.config.js must resolve media public base URL from eas.json',
  );
  assert(
    productionResolved.extra?.eas?.projectId === expectedProjectId,
    'production app.config.js must preserve Expo projectId',
  );

  const productionIosResolved = resolveAppConfig(appConfig, expoConfig, {
    NODE_ENV: productionEnv.NODE_ENV,
    EAS_BUILD_PROFILE: 'production',
    EAS_BUILD_PLATFORM: 'ios',
    APP_ENV: productionEnv.APP_ENV,
    EXPO_PUBLIC_API_BASE_URL: productionEnv.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL: productionEnv.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'ci-production-web-client-id',
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ci-production-ios-client-id',
  });

  assert(
    productionIosResolved.extra?.appEnv === 'production',
    'production iOS app.config.js must resolve appEnv=production',
  );
  assert(
    productionIosResolved.extra?.apiBaseUrl === productionEnv.EXPO_PUBLIC_API_BASE_URL,
    'production iOS app.config.js must resolve API base URL from eas.json',
  );
  assert(
    productionIosResolved.extra?.mediaPublicBaseUrl === productionEnv.EXPO_PUBLIC_MEDIA_PUBLIC_BASE_URL,
    'production iOS app.config.js must resolve media public base URL from eas.json',
  );
  assert(
    productionIosResolved.extra?.eas?.projectId === expectedProjectId,
    'production iOS app.config.js must preserve Expo projectId',
  );

  console.log('Expo release config smoke passed.');
}

main();
