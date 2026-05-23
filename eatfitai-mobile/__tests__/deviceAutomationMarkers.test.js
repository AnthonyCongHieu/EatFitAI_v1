const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

describe('real-device automation markers', () => {
  it('covers every current main function group in the real-device smoke script', () => {
    const source = readSource('scripts/real-device-adb-flow.js');
    const expectedMainFlowMarkers = [
      'home-screen',
      'meal-diary-screen',
      'food-search-screen',
      'ai-scan-screen',
      'voice-screen',
      'stats-screen',
      'profile-screen',
    ];

    expectedMainFlowMarkers.forEach((marker) => {
      expect(source).toContain(marker);
    });
  });

  it('exposes stable Food Search markers used by the ADB UI readback flow', () => {
    const source = readSource('src/app/screens/diary/FoodSearchScreen.tsx');

    expect(source).toContain("../../../testing/testIds");
    expect(source).toContain('testID={TEST_IDS.foodSearch.screen}');
    expect(source).toContain('nativeID={TEST_IDS.foodSearch.screen}');
    expect(source).toContain('testID={TEST_IDS.foodSearch.queryInput}');
    expect(source).toContain('nativeID={TEST_IDS.foodSearch.queryInput}');
    expect(source).toContain('testID={index === 0 ? TEST_IDS.foodSearch.firstResultCard : undefined}');
    expect(source).toContain('testID={index === 0 ? TEST_IDS.foodSearch.firstAddButton : undefined}');
  });

  it('exposes stable Food Detail markers for fallback UI automation', () => {
    const source = readSource('src/app/screens/diary/FoodDetailScreen.tsx');

    expect(source).toContain("../../../testing/testIds");
    expect(source).toContain('testID={TEST_IDS.foodDetail.screen}');
    expect(source).toContain('nativeID={TEST_IDS.foodDetail.screen}');
    expect(source).toContain('testID={TEST_IDS.foodDetail.gramsInput}');
    expect(source).toContain('nativeID={TEST_IDS.foodDetail.gramsInput}');
    expect(source).toContain('testID={TEST_IDS.foodDetail.submitButton}');
    expect(source).toContain('nativeID={TEST_IDS.foodDetail.submitButton}');
  });

  it('retries device API login only for transport failures', () => {
    const source = readSource('scripts/real-device-adb-flow.js');

    expect(source).toContain('function isRetryableApiTransportFailure');
    expect(source).toContain('response.status !== null');
    expect(source).toContain('EATFITAI_DEVICE_API_LOGIN_ATTEMPTS');
    expect(source).toContain('attempts: response.attempts || 1');
  });

  it('finalizes ADB screenrecord before pulling video evidence', () => {
    const source = readSource('scripts/real-device-adb-flow.js');

    expect(source).toContain("['shell', 'pkill', '-2', 'screenrecord']");
    expect(source).toContain("['shell', 'killall', '-2', 'screenrecord']");
    expect(source).toContain('ok: pull.ok && bytes > 0');
    expect(source).toContain('screenrecord was empty');
  });

  it('exposes stable quick-add markers before Food Search opens', () => {
    const diarySource = readSource('src/app/screens/diary/MealDiaryScreen.tsx');
    const quickActionsSource = readSource('src/components/home/QuickActionsOverlay.tsx');

    expect(diarySource).toContain('testID={TEST_IDS.mealDiary.addManualButton}');
    expect(diarySource).toContain('nativeID={TEST_IDS.mealDiary.addManualButton}');
    expect(quickActionsSource).toContain('testID={action.testID}');
    expect(quickActionsSource).toContain('nativeID={action.testID}');
    expect(quickActionsSource).toContain('accessibilityLabel={action.testID}');
  });

  it('provides an Expo Go video audit harness for current managed UI changes', () => {
    const packageJson = JSON.parse(readSource('package.json'));
    const scriptSource = readSource('scripts/expo-go-flow-audit.js');
    const qaGuide = fs.readFileSync(
      path.resolve(mobileRoot, '..', 'docs', 'qa', 'expo-go-production-flow-test.md'),
      'utf8',
    );

    expect(packageJson.scripts['device:expo-go-flow-audit:android']).toBe(
      'node scripts/expo-go-flow-audit.js',
    );
    expect(scriptSource).toContain('screenrecord');
    expect(scriptSource).toContain('01-home-initial');
    expect(scriptSource).toContain('05-mochi-hub');
    expect(scriptSource).toContain('assertCurrentUi');
    expect(scriptSource).toContain('assertExpoForeground');
    expect(scriptSource).toContain('Interaction Trace');
    expect(scriptSource).toContain("pidof', '-s', EXPO_GO_PACKAGE");
    expect(scriptSource).toContain('EXPO_GO_AUDIT_DEEP');
    expect(scriptSource).toContain('09c-food-add-readback');
    expect(scriptSource).toContain('buildAsciiKeyEventArgs');
    expect(scriptSource).toContain('report.failures');
    expect(scriptSource).toContain('Strict Review Checklist');
    expect(qaGuide).toContain('Production test cases');
    expect(qaGuide).toContain('MoChi review checklist');
    expect(qaGuide).toContain('Click strategy chuẩn');
  });
});
