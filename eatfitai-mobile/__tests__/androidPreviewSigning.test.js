/* eslint-env jest, node */
/* eslint-disable @typescript-eslint/no-var-requires */

const path = require('path');
const fs = require('fs');

const mobileRoot = path.resolve(__dirname, '..');

const googleServices = {
  client: [
    {
      client_info: {
        android_client_info: {
          package_name: 'com.eatfitai.app',
        },
      },
      oauth_client: [
        {
          client_type: 1,
          android_info: {
            package_name: 'com.eatfitai.app',
            certificate_hash: '83ffa699532ed1051a38535c7b01e21d5f41c51f',
          },
        },
        {
          client_type: 3,
          client_id: 'web-client.apps.googleusercontent.com',
        },
      ],
    },
  ],
};

function createExecMock({ packageName = 'com.eatfitai.app', sha1 = '83:FF:A6:99:53:2E:D1:05:1A:38:53:5C:7B:01:E2:1D:5F:41:C5:1F' } = {}) {
  return jest.fn((toolPath) => {
    const toolName = path.basename(toolPath).toLowerCase();
    if (toolName.startsWith('aapt')) {
      return Buffer.from(`package: name='${packageName}' versionCode='1' versionName='1.0.0'\n`);
    }
    if (toolName.startsWith('apksigner')) {
      return Buffer.from(`Signer #1 certificate SHA-1 digest: ${sha1}\n`);
    }
    throw new Error(`Unexpected tool: ${toolPath}`);
  });
}

function resolveBuildTool(toolName) {
  return `${toolName}.exe`;
}

describe('Android preview APK signing guard', () => {
  it('uses google-services Android OAuth package and SHA-1 as the source of truth', () => {
    const { parseGoogleServicesIdentity } = require('../scripts/lib/android-preview-signing');

    expect(parseGoogleServicesIdentity(googleServices)).toEqual({
      packageName: 'com.eatfitai.app',
      certificateSha1: '83ffa699532ed1051a38535c7b01e21d5f41c51f',
    });
  });

  it('passes when APK package and signing SHA-1 match google-services', () => {
    const { verifyAndroidPreviewApk } = require('../scripts/lib/android-preview-signing');
    const execFileSync = createExecMock();

    const result = verifyAndroidPreviewApk({
      apkPath: 'app-release.apk',
      googleServices,
      execFileSync,
      resolveBuildTool,
    });

    expect(result).toEqual({
      apkPath: 'app-release.apk',
      expectedPackageName: 'com.eatfitai.app',
      packageName: 'com.eatfitai.app',
      expectedCertificateSha1: '83ffa699532ed1051a38535c7b01e21d5f41c51f',
      certificateSha1: '83ffa699532ed1051a38535c7b01e21d5f41c51f',
    });
  });

  it('rejects APKs built with a different applicationId before install', () => {
    const { verifyAndroidPreviewApk } = require('../scripts/lib/android-preview-signing');

    expect(() =>
      verifyAndroidPreviewApk({
        apkPath: 'app-release.apk',
        googleServices,
        execFileSync: createExecMock({ packageName: 'com.example.other' }),
        resolveBuildTool,
      }),
    ).toThrow(/APK package mismatch.*com\.eatfitai\.app.*com\.example\.other/);
  });

  it('rejects APKs signed with a different certificate before install', () => {
    const { verifyAndroidPreviewApk } = require('../scripts/lib/android-preview-signing');

    expect(() =>
      verifyAndroidPreviewApk({
        apkPath: 'app-release.apk',
        googleServices,
        execFileSync: createExecMock({ sha1: '11:22:33:44' }),
        resolveBuildTool,
      }),
    ).toThrow(/APK signing SHA-1 mismatch.*83ffa699532ed1051a38535c7b01e21d5f41c51f.*11223344/);
  });

  it('wires the APK identity verifier into both build and install preview lanes', () => {
    const buildScript = fs.readFileSync(path.join(mobileRoot, 'scripts', 'build-android-preview.ps1'), 'utf8');
    const installScript = fs.readFileSync(path.join(mobileRoot, 'scripts', 'install-android-preview.ps1'), 'utf8');

    expect(buildScript).toMatch(/verify-android-preview-apk\.js/);
    expect(installScript).toMatch(/verify-android-preview-apk\.js/);
  });

  it('clears and verifies Expo Updates embedded assets before shipping preview APKs', () => {
    const buildScript = fs.readFileSync(path.join(mobileRoot, 'scripts', 'build-android-preview.ps1'), 'utf8');

    expect(buildScript).toMatch(/createReleaseUpdatesResources/);
    expect(buildScript).toMatch(/mergeReleaseAssets/);
    expect(buildScript).toMatch(/Assert-EmbeddedUpdatesManifestHasMascotAssets/);
    expect(buildScript).toMatch(/src_assets_mascot_mochi_characters_/);
  });

  it('keeps release signing strict by default instead of silently falling back to local debug keys', () => {
    const gradleScript = fs.readFileSync(path.join(mobileRoot, 'android', 'app', 'build.gradle'), 'utf8');

    expect(gradleScript).toMatch(/Release-like Android builds require android\/keystore\.properties/);
    expect(gradleScript).not.toMatch(/signingConfig hasReleaseKeystore \? signingConfigs\.release : signingConfigs\.debug/);
  });

  it('does not pipe adb output into Invoke-Adb return objects in the install lane', () => {
    const installScript = fs.readFileSync(path.join(mobileRoot, 'scripts', 'install-android-preview.ps1'), 'utf8');

    expect(installScript).toMatch(/\[switch\]\$EchoOutput/);
    expect(installScript).toMatch(/Invoke-Adb -Arguments @\('install', '-r', \$ApkPath\) -EchoOutput/);
    expect(installScript).not.toMatch(/Write-Output \$_/);
  });
});
