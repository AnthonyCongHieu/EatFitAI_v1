/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs');

const {
  AUTOMATION_BY_ID,
  parseMatrixMarkdown,
  safeName,
  testcaseRows,
} = require('../scripts/apk-e2e-suite');

describe('APK E2E suite tooling', () => {
  const matrixPath = path.resolve(
    __dirname,
    '..',
    '..',
    'docs',
    'qa',
    'FULL_APP_E2E_RECORDING_TESTCASE_MATRIX_2026-05-20.md',
  );

  it('parses the full recording matrix into flow-addressable testcase folders', () => {
    const cases = parseMatrixMarkdown(matrixPath);

    expect(cases.length).toBeGreaterThan(80);
    expect(cases.find((testcase) => testcase.id === 'AUTH-01')).toMatchObject({
      priority: 'P0',
      executionType: 'automated-adb',
      automationMode: 'login-real',
    });
    expect(cases.find((testcase) => testcase.id === 'SCAN-01')).toMatchObject({
      priority: 'P0',
      executionType: 'automated-adb',
      automationMode: 'scan-save-readback',
    });
    expect(cases.find((testcase) => testcase.id === 'AUTH-05')).toMatchObject({
      executionType: 'manual-recorded',
    });
  });

  it('keeps generated folder names stable and ASCII-safe', () => {
    expect(safeName('Reset code via Gmail')).toBe('reset-code-via-gmail');
    expect(safeName('Thêm bữa / Quét thức ăn')).toBe('them-bua-quet-thuc-an');
  });

  it('exports spreadsheet-ready rows with suggested commands', () => {
    const cases = parseMatrixMarkdown(matrixPath);
    const rows = testcaseRows(cases);
    const auth = rows.find((row) => row[0] === 'AUTH-01');
    const reset = rows.find((row) => row[0] === 'AUTH-05');

    expect(rows[0]).toContain('Suggested Command');
    expect(auth[11]).toContain('scripts/apk-e2e-suite.js run --id AUTH-01 --record');
    expect(reset[11]).toContain('scripts/apk-e2e-suite.js record --id AUTH-05 --duration 150');
  });

  it('maps only stable automated ADB flows to existing real-device modes', () => {
    expect(AUTOMATION_BY_ID['DIARY-02'].mode).toBe('food-search-ui-readback');
    expect(AUTOMATION_BY_ID['VOICE-01'].mode).toBe('voice-text-readback');
    expect(AUTOMATION_BY_ID['AUTH-05']).toBeUndefined();
  });

  it('uses adb input text for email fields to avoid Vietnamese IME keyevent composition', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', 'scripts', 'real-device-adb-flow.js'),
      'utf8',
    );
    const emailFunction = source.match(/function inputEmailText[\s\S]+?\n}\n/)?.[0] || '';

    expect(emailFunction).toContain('adb-input-text-email');
    expect(emailFunction).not.toContain('buildAsciiKeyEventArgs');
  });
});
