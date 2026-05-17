import fs from 'fs';
import path from 'path';

const readSource = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('public Android release QA gate', () => {
  it('targets production Lightsail domains and blocks the suspended Render backend', () => {
    const source = readSource('scripts/public-release-qa.js');

    expect(source).toContain("DEFAULT_BACKEND_URL = 'https://eatfitai-api.duckdns.org'");
    expect(source).toContain(
      "DEFAULT_AI_PROVIDER_URL = 'https://eatfitai-ai.duckdns.org'",
    );
    expect(source).toContain(
      "LEGACY_RENDER_BACKEND_URL = 'https://eatfitai-backend.onrender.com'",
    );
    expect(source).toContain('must not use legacy suspended Render backend');
  });

  it('keeps release gates aligned with the Android public QA checklist', () => {
    const source = readSource('scripts/public-release-qa.js');

    for (const gate of [
      'preflight',
      'code',
      'cloud',
      'android',
      'device',
      'visual',
      'final',
    ]) {
      expect(source).toContain(gate);
    }

    expect(source).toContain('device:doctor:android');
    expect(source).toContain('smoke:auth:api');
    expect(source).toContain('smoke:backend:non-ui');
    expect(source).toContain('release:gate');
    expect(source).toContain('device:rc-proof:android');
    expect(source).toContain('device:visual-ui-audit:android');
  });

  it('requires real-device and disposable auth evidence by default', () => {
    const source = readSource('scripts/public-release-qa.js');

    expect(source).toContain('EATFITAI_ANDROID_TARGET');
    expect(source).toContain('real-device');
    expect(source).toContain('ANDROID_SERIAL');
    expect(source).toContain('EATFITAI_DEMO_MAIL_API');
    expect(source).toContain(
      'Disposable mailbox is required for public release cloud smoke',
    );
    expect(source).toContain("EATFITAI_RELEASE_GATE_DISPOSABLE_AUTH) || '1'");
  });
});
