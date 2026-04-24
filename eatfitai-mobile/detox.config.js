const path = require('path');
const fs = require('fs');

const androidSerial = process.env.ANDROID_SERIAL;
const repoRoot = path.dirname(__dirname);
const detoxApkDir =
  process.env.EATFITAI_DETOX_APK_DIR ||
  path.join(process.env.LOCALAPPDATA || process.cwd(), 'EatFitAI', 'detox');

const resolveAndroidSdkRoot = () => {
  const candidates = [
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    path.join(repoRoot, '_tooling', 'android-sdk'),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
};

if (!androidSerial) {
  throw new Error('ANDROID_SERIAL is required for android.att.release Detox runs.');
}

const androidSdkRoot = resolveAndroidSdkRoot();
if (!androidSdkRoot) {
  throw new Error('ANDROID_SDK_ROOT is required and no Android SDK installation was found.');
}
process.env.ANDROID_SDK_ROOT = androidSdkRoot;
process.env.ANDROID_HOME = process.env.ANDROID_HOME || androidSdkRoot;

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 240000,
      teardownTimeout: 120000,
      reportSpecs: true,
    },
  },
  apps: {
    'android.release': {
      type: 'android.apk',
      binaryPath: path.join(detoxApkDir, 'app-release.apk'),
      testBinaryPath: path.join(detoxApkDir, 'app-release-androidTest.apk'),
      build:
        'powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File scripts/build-android-detox.ps1',
    },
  },
  devices: {
    attached: {
      type: 'android.attached',
      device: {
        adbName: androidSerial,
      },
    },
  },
  configurations: {
    'android.att.release': {
      device: 'attached',
      app: 'android.release',
    },
  },
};
