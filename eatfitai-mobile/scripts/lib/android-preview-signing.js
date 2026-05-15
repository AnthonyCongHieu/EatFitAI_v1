const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const DEFAULT_PACKAGE_NAME = 'com.eatfitai.app';

function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normalizeSha1(value) {
  return String(value || '')
    .replace(/[^a-fA-F0-9]/g, '')
    .toLowerCase();
}

function parseGoogleServicesIdentity(googleServices, options = {}) {
  const identities = parseGoogleServicesIdentities(googleServices, options);
  if (identities.length > 0) {
    return identities[0];
  }

  throw new Error('google-services.json does not contain an Android OAuth client with package name and certificate_hash.');
}

function parseGoogleServicesIdentities(googleServices, options = {}) {
  const expectedPackageName = options.expectedPackageName || '';
  const identities = [];
  for (const client of asArray(googleServices.client)) {
    const clientPackageName = client?.client_info?.android_client_info?.package_name || '';
    if (expectedPackageName && clientPackageName && clientPackageName !== expectedPackageName) {
      continue;
    }

    for (const oauthClient of asArray(client.oauth_client)) {
      if (Number(oauthClient?.client_type) !== 1) {
        continue;
      }

      const androidInfo = oauthClient.android_info || {};
      const packageName = androidInfo.package_name || clientPackageName;
      const certificateSha1 = normalizeSha1(androidInfo.certificate_hash);
      if (!packageName || !certificateSha1) {
        continue;
      }
      if (clientPackageName && packageName !== clientPackageName) {
        throw new Error(
          `google-services.json package mismatch: client_info has ${clientPackageName}, Android OAuth has ${packageName}.`,
        );
      }

      identities.push({ packageName, certificateSha1 });
    }
  }

  if (identities.length === 0) {
    throw new Error('google-services.json does not contain an Android OAuth client with package name and certificate_hash.');
  }

  return identities;
}

function readGoogleServicesIdentity(googleServicesPath, options = {}) {
  const raw = fs.readFileSync(googleServicesPath, 'utf8');
  return parseGoogleServicesIdentity(JSON.parse(raw), options);
}

function readGoogleServicesIdentities(googleServicesPath, options = {}) {
  const raw = fs.readFileSync(googleServicesPath, 'utf8');
  return parseGoogleServicesIdentities(JSON.parse(raw), options);
}

function parseAaptBadging(output) {
  const text = String(output || '');
  const packageMatch = text.match(/package:\s+name='([^']+)'/);
  if (!packageMatch) {
    throw new Error('Unable to read APK package name from aapt badging output.');
  }

  return { packageName: packageMatch[1] };
}

function parseApkSignerCerts(output) {
  const text = String(output || '');
  const sha1Match = text.match(/Signer #1 certificate SHA-1 digest:\s*([0-9a-fA-F:]+)/);
  if (!sha1Match) {
    throw new Error('Unable to read APK signing SHA-1 from apksigner output.');
  }

  return { certificateSha1: normalizeSha1(sha1Match[1]) };
}

function compareAndroidToolVersions(left, right) {
  const leftParts = left.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return 0;
}

function findAndroidSdkRoot(options = {}) {
  const candidates = [
    options.sdkRoot,
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    options.repoRoot ? path.join(options.repoRoot, '_tooling', 'android-sdk') : '',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return path.resolve(candidate);
    }
  }

  throw new Error('Android SDK not found. Set ANDROID_SDK_ROOT/ANDROID_HOME or provide _tooling/android-sdk.');
}

function findAndroidBuildTool(toolName, options = {}) {
  const sdkRoot = findAndroidSdkRoot(options);
  const buildToolsRoot = path.join(sdkRoot, 'build-tools');
  if (!fs.existsSync(buildToolsRoot)) {
    throw new Error(`Android build-tools not found under ${buildToolsRoot}.`);
  }

  const candidates = fs
    .readdirSync(buildToolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(compareAndroidToolVersions)
    .reverse();

  const names =
    process.platform === 'win32'
      ? [`${toolName}.bat`, `${toolName}.exe`, toolName]
      : [toolName, `${toolName}.sh`];

  for (const version of candidates) {
    for (const name of names) {
      const candidate = path.join(buildToolsRoot, version, name);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  throw new Error(`Android build tool '${toolName}' was not found under ${buildToolsRoot}.`);
}

function quoteWindowsCommandArg(value) {
  const text = String(value);
  if (!/[\s"&()^|<>]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '\\"')}"`;
}

function runTool(toolPath, args, execFileSync = childProcess.execFileSync, execSync = childProcess.execSync) {
  const options = {
    encoding: 'utf8',
    windowsHide: true,
  };
  if (/\.(bat|cmd)$/i.test(toolPath)) {
    const command = [toolPath, ...args].map(quoteWindowsCommandArg).join(' ');
    const output = execSync(command, options);
    return Buffer.isBuffer(output) ? output.toString('utf8') : String(output || '');
  }

  const output = execFileSync(toolPath, args, options);
  return Buffer.isBuffer(output) ? output.toString('utf8') : String(output || '');
}

function inspectApk(apkPath, options = {}) {
  const resolveBuildTool = options.resolveBuildTool || ((toolName) => findAndroidBuildTool(toolName, options));
  const execFileSync = options.execFileSync || childProcess.execFileSync;
  const execSync = options.execSync || childProcess.execSync;
  const aaptPath = resolveBuildTool('aapt');
  const apkSignerPath = resolveBuildTool('apksigner');
  const badging = runTool(aaptPath, ['dump', 'badging', apkPath], execFileSync, execSync);
  const certs = runTool(apkSignerPath, ['verify', '--print-certs', apkPath], execFileSync, execSync);

  return {
    ...parseAaptBadging(badging),
    ...parseApkSignerCerts(certs),
  };
}

function verifyAndroidPreviewApk(options = {}) {
  const apkPath = options.apkPath;
  if (!apkPath) {
    throw new Error('apkPath is required.');
  }

  const identities = options.googleServices
    ? parseGoogleServicesIdentities(options.googleServices, { expectedPackageName: options.expectedPackageName })
    : readGoogleServicesIdentities(options.googleServicesPath, { expectedPackageName: options.expectedPackageName });
  const apk = inspectApk(apkPath, options);
  const packageIdentities = identities.filter((identity) => identity.packageName === apk.packageName);

  if (packageIdentities.length === 0) {
    const expectedPackageNames = [...new Set(identities.map((identity) => identity.packageName))].join(', ');
    throw new Error(`APK package mismatch. Expected ${expectedPackageNames}, got ${apk.packageName}.`);
  }

  const matchedIdentity = packageIdentities.find((identity) => identity.certificateSha1 === apk.certificateSha1);
  if (!matchedIdentity) {
    const expectedCertificateSha1s = packageIdentities
      .map((identity) => identity.certificateSha1)
      .join(', ');
    throw new Error(
      `APK signing SHA-1 mismatch. Expected one of ${expectedCertificateSha1s}, got ${apk.certificateSha1}.`,
    );
  }

  return {
    apkPath,
    expectedPackageName: matchedIdentity.packageName,
    packageName: apk.packageName,
    expectedCertificateSha1: matchedIdentity.certificateSha1,
    certificateSha1: apk.certificateSha1,
  };
}

module.exports = {
  DEFAULT_PACKAGE_NAME,
  normalizeSha1,
  parseGoogleServicesIdentity,
  parseGoogleServicesIdentities,
  readGoogleServicesIdentity,
  readGoogleServicesIdentities,
  parseAaptBadging,
  parseApkSignerCerts,
  findAndroidSdkRoot,
  findAndroidBuildTool,
  inspectApk,
  verifyAndroidPreviewApk,
};
