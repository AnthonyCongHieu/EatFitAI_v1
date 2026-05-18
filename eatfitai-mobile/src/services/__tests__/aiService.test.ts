import { normalizeMappedFoodItem, normalizeRecipeSuggestionForTest } from '../aiService';

describe('normalizeMappedFoodItem', () => {
  it('normalizes default serving metadata from vision items', () => {
    const item = normalizeMappedFoodItem({
      label: 'pho',
      confidence: 0.8,
      foodItemId: '42',
      userFoodItemId: '99',
      source: 'user',
      defaultServingUnitId: '7',
      defaultServingUnitName: 'bowl',
      defaultServingUnitSymbol: 'bowl',
      defaultPortionQuantity: '1.5',
      defaultGrams: '320',
    });

    expect(item.userFoodItemId).toBe(99);
    expect(item.source).toBe('user');
    expect(item.defaultServingUnitId).toBe(7);
    expect(item.defaultServingUnitName).toBe('bowl');
    expect(item.defaultServingUnitSymbol).toBe('bowl');
    expect(item.defaultPortionQuantity).toBe(1.5);
    expect(item.defaultGrams).toBe(320);
    expect(item.servingUnit).toBe('bowl');
  });

  it('normalizes invalid default serving values to null', () => {
    const item = normalizeMappedFoodItem({
      label: 'rice',
      confidence: 0.8,
      defaultServingUnitId: 'not-a-number',
      defaultServingUnitName: null,
      defaultServingUnitSymbol: null,
      defaultPortionQuantity: 0,
    });

    expect(item.defaultServingUnitId).toBeNull();
    expect(item.defaultServingUnitName).toBeNull();
    expect(item.defaultServingUnitSymbol).toBeNull();
    expect(item.defaultPortionQuantity).toBeNull();
    expect(item.servingUnit).toBeNull();
  });
});

describe('normalizeRecipeSuggestionForTest', () => {
  it('normalizes recipe media, timing, score, and explanations', () => {
    const item = normalizeRecipeSuggestionForTest({
      recipeId: 7,
      recipeName: 'Gà áp chảo',
      imageUrl: 'recipe-images/v1/thumb/ga-ap-chao.webp',
      imageVariants: {
        thumbUrl: 'recipe-images/v1/thumb/ga-ap-chao.webp',
        mediumUrl: 'recipe-images/v1/medium/ga-ap-chao.webp',
      },
      cookTimeMinutes: 22,
      difficulty: 'Dễ',
      servingCount: 2,
      totalGrams: 420,
      matchScore: 88.5,
      scoreReasons: ['Khớp 3 nguyên liệu', 'Giàu đạm'],
      missingIngredientCount: 1,
      totalCalories: 380,
      totalProtein: 32,
      totalCarbs: 18,
      totalFat: 14,
      matchedIngredientsCount: 3,
      totalIngredientsCount: 4,
      matchPercentage: 75,
      matchedIngredients: ['Thịt gà', 'Tỏi', 'Cà chua'],
      missingIngredients: ['Hành lá'],
      allIngredients: ['Thịt gà', 'Tỏi', 'Cà chua', 'Hành lá'],
    });

    expect(item.imageUrl).toBe('recipe-images/v1/thumb/ga-ap-chao.webp');
    expect(item.imageVariants?.mediumUrl).toBe('recipe-images/v1/medium/ga-ap-chao.webp');
    expect(item.cookTimeMinutes).toBe(22);
    expect(item.difficulty).toBe('Dễ');
    expect(item.servingCount).toBe(2);
    expect(item.totalGrams).toBe(420);
    expect(item.matchScore).toBe(88.5);
    expect(item.scoreReasons).toEqual(['Khớp 3 nguyên liệu', 'Giàu đạm']);
    expect(item.missingIngredientCount).toBe(1);
  });
});
