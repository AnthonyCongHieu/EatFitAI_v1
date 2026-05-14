#!/usr/bin/env node

const path = require('path');
const {
  DEFAULT_PACKAGE_NAME,
  verifyAndroidPreviewApk,
} = require('./lib/android-preview-signing');

function readOption(name, fallback = '') {
  const inlinePrefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(inlinePrefix));
  if (inline) {
    return inline.slice(inlinePrefix.length).trim() || fallback;
  }

  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1].trim() || fallback;
  }

  return fallback;
}

const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..');
const apkPath = path.resolve(
  readOption('--apk', path.join(projectRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')),
);
const googleServicesPath = path.resolve(
  readOption('--google-services', path.join(projectRoot, 'android', 'app', 'google-services.json')),
);
const expectedPackageName = readOption('--package', DEFAULT_PACKAGE_NAME);

try {
  const result = verifyAndroidPreviewApk({
    apkPath,
    googleServicesPath,
    expectedPackageName,
    repoRoot,
  });

  console.log('Verified Android preview APK identity.');
  console.log(`apk=${result.apkPath}`);
  console.log(`package=${result.packageName}`);
  console.log(`sha1=${result.certificateSha1}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
