const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

describe('visual UI audit ADB lane', () => {
  it('builds ASCII keyevents for email text and special characters', () => {
    const { buildAsciiKeyEventArgs } = require('../scripts/lib/adb-text');

    expect(buildAsciiKeyEventArgs('minh260407012628@example.com', { lowercase: true })).toEqual([
      'shell',
      'input',
      'keyevent',
      'KEYCODE_M',
      'KEYCODE_I',
      'KEYCODE_N',
      'KEYCODE_H',
      'KEYCODE_2',
      'KEYCODE_6',
      'KEYCODE_0',
      'KEYCODE_4',
      'KEYCODE_0',
      'KEYCODE_7',
      'KEYCODE_0',
      'KEYCODE_1',
      'KEYCODE_2',
      'KEYCODE_6',
      'KEYCODE_2',
      'KEYCODE_8',
      'KEYCODE_AT',
      'KEYCODE_E',
      'KEYCODE_X',
      'KEYCODE_A',
      'KEYCODE_M',
      'KEYCODE_P',
      'KEYCODE_L',
      'KEYCODE_E',
      'KEYCODE_PERIOD',
      'KEYCODE_C',
      'KEYCODE_O',
      'KEYCODE_M',
    ]);
  });

  it('defines the expected short video flows and expands all deterministically', () => {
    const {
      VISUAL_AUDIT_FLOWS,
      resolveVisualAuditFlowNames,
    } = require('../scripts/lib/visual-ui-audit');

    expect(Object.keys(VISUAL_AUDIT_FLOWS)).toEqual([
      'bottom-nav',
      'onboarding-rulers',
      'core-app',
    ]);
    expect(resolveVisualAuditFlowNames('all')).toEqual([
      'bottom-nav',
      'onboarding-rulers',
      'core-app',
    ]);
    expect(resolveVisualAuditFlowNames('bottom-nav')).toEqual(['bottom-nav']);
  });

  it('builds a review-ready bug matrix with stable required fields', () => {
    const { buildVisualBugMatrix } = require('../scripts/lib/visual-ui-audit');

    const matrix = buildVisualBugMatrix(['bottom-nav', 'onboarding-rulers']);

    expect(matrix.version).toBe(1);
    expect(matrix.reviewStatus).toBe('needs-human-review');
    expect(matrix.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'UI-001',
          flow: 'bottom-nav',
          severity: 'S2 visible bug',
          status: 'known-before-run',
        }),
        expect.objectContaining({
          id: 'UI-002',
          flow: 'onboarding-rulers',
          severity: 'S2 visible bug',
          status: 'known-before-run',
        }),
      ]),
    );
    matrix.items.forEach((item) => {
      expect(Object.keys(item)).toEqual([
        'id',
        'flow',
        'screen',
        'severity',
        'timestamp',
        'expected',
        'actual',
        'evidence',
        'suspectedArea',
        'fixCandidate',
        'regressionRisks',
        'status',
      ]);
    });
  });

  it('exposes package scripts for full and focused visual audits', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'package.json'), 'utf8'));

    expect(pkg.scripts['device:visual-ui-audit:android']).toBe(
      'node scripts/real-device-adb-flow.js visual-ui-audit --flow all --record',
    );
    expect(pkg.scripts['device:visual-ui-audit:bottom-nav:android']).toBe(
      'node scripts/real-device-adb-flow.js visual-ui-audit --flow bottom-nav --record',
    );
    expect(pkg.scripts['device:visual-ui-audit:onboarding-rulers:android']).toBe(
      'node scripts/real-device-adb-flow.js visual-ui-audit --flow onboarding-rulers --record',
    );
  });

  it('registers visual-ui-audit as a real-device ADB mode', () => {
    const source = fs.readFileSync(
      path.join(mobileRoot, 'scripts/real-device-adb-flow.js'),
      'utf8',
    );

    expect(source).toContain("'visual-ui-audit'");
    expect(source).toContain('runVisualUiAudit');
    expect(source).toContain('inputEmailText');
    expect(source).toContain('dismissHomeFirstLoginTutorial');
    expect(source).toContain('EATFITAI_ONBOARDING_LOGIN_EMAIL');
    expect(source).toContain('ensureFreshOnboardingIntroScreen');
    expect(source).toContain('ONBOARDING_RULER_MARKERS');
    expect(source).toContain('Bỏ qua hướng dẫn');
    expect(source).toContain('requireCredentials: true');
  });
});
