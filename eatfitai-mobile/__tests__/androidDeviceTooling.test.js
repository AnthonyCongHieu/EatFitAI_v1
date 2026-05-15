import fs from 'fs';
import path from 'path';

const readSource = (relativePath) => {
  const fullPath = path.join(__dirname, '..', relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
};

describe('Android device spy and fast lane tooling', () => {
  it('exposes package scripts for device spy and fast Android lanes', () => {
    const packageJson = JSON.parse(readSource('package.json'));

    expect(packageJson.scripts['device:spy:android']).toBe('node scripts/device-spy.js once');
    expect(packageJson.scripts['device:spy:watch:android']).toBe(
      'node scripts/device-spy.js watch --interval 1500',
    );
    expect(packageJson.scripts['device:spy:serve:android']).toBe(
      'node scripts/device-spy.js serve --port 49152',
    );
    expect(packageJson.scripts['android:fast']).toContain('scripts/android-fast-lane.ps1');
    expect(packageJson.scripts['android:fast:preview']).toContain('-Mode Preview');
  });

  it('requires an explicit real-device target before spy capture', () => {
    const spySource = readSource('scripts/device-spy.js');
    const coreSource = readSource('scripts/lib/device-spy-core.js');

    expect(spySource).toContain('once');
    expect(spySource).toContain('watch');
    expect(spySource).toContain('serve');
    expect(coreSource).toContain('EATFITAI_ANDROID_TARGET');
    expect(coreSource).toContain('ANDROID_SERIAL');
    expect(coreSource).toContain('screencap');
    expect(coreSource).toContain('uiautomator');
    expect(coreSource).toContain('logcat');
  });

  it('keeps fast lane script as a coordinator around existing build scripts', () => {
    const source = readSource('scripts/android-fast-lane.ps1');

    expect(source).toContain('[ValidateSet');
    expect(source).toContain('start-mobile-usb-dev.ps1');
    expect(source).toContain('build-android-preview.ps1');
    expect(source).toContain('install-android-preview.ps1');
    expect(source).toContain('device-spy.js serve');
    expect(source).toContain('real-device-adb-flow.js doctor');
    expect(source).toContain('visual-ui-audit');
  });
});
