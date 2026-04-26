const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

describe('real-device automation markers', () => {
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

  it('exposes stable quick-add markers before Food Search opens', () => {
    const diarySource = readSource('src/app/screens/diary/MealDiaryScreen.tsx');
    const quickActionsSource = readSource('src/components/home/QuickActionsOverlay.tsx');

    expect(diarySource).toContain('testID={TEST_IDS.mealDiary.addManualButton}');
    expect(diarySource).toContain('nativeID={TEST_IDS.mealDiary.addManualButton}');
    expect(quickActionsSource).toContain('testID={action.testID}');
    expect(quickActionsSource).toContain('nativeID={action.testID}');
    expect(quickActionsSource).toContain('accessibilityLabel={action.testID}');
  });
});
