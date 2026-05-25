import {
  buildRecipeIngredientRows,
  formatRecipeSourceLabel,
  getRecipeMatchBadgeLabel,
  inferRecipeVisualCategory,
  resolveRecipeVisual,
} from '../src/components/recipe/recipeVisuals';

describe('recipeVisuals', () => {
  const pathnames = (urls: string[] | undefined) =>
    (urls ?? []).map((url) => new URL(url).pathname);

  it('classifies Vietnamese recipe names into category fallback visuals', () => {
    expect(inferRecipeVisualCategory({ recipeName: 'Phở gà' })).toBe('noodle_soup');
    expect(inferRecipeVisualCategory({ recipeName: 'Cơm gà' })).toBe('rice_plate');
    expect(inferRecipeVisualCategory({ recipeName: 'Cá hấp gừng' })).toBe('steamed');
    expect(inferRecipeVisualCategory({ recipeName: 'Gà kho gừng' })).toBe('braised');
  });

  it('uses category fallback when recipe media is missing', () => {
    const visual = resolveRecipeVisual({ recipeName: 'Phở gà' });

    expect(visual).toMatchObject({
      status: 'category_fallback',
      category: 'noodle_soup',
    });
    expect(pathnames(visual.urls)).toEqual([
      '/food-images/v2/medium/pho.webp',
      '/food-images/v2/thumb/pho.webp',
      '/food-images/v2/medium/noodles.webp',
      '/food-images/v2/thumb/noodles.webp',
    ]);
  });

  it('keeps real R2 variants before category fallback', () => {
    const visual = resolveRecipeVisual(
      {
        recipeName: 'Phở gà',
        imageUrl: 'recipe-images/v1/thumb/pho-ga.webp',
        imageVariants: {
          mediumUrl: 'recipe-images/v1/medium/pho-ga.webp',
          thumbUrl: 'recipe-images/v1/thumb/pho-ga.webp',
        },
      },
      { size: 'medium' },
    );

    expect(visual).toMatchObject({
      status: 'remote',
    });
    expect(pathnames(visual.urls)).toEqual([
      '/recipe-images/v1/medium/pho-ga.webp',
      '/recipe-images/v1/thumb/pho-ga.webp',
      '/food-images/v2/medium/pho.webp',
      '/food-images/v2/thumb/pho.webp',
      '/food-images/v2/medium/noodles.webp',
      '/food-images/v2/thumb/noodles.webp',
    ]);
  });

  it('formats match badges without opaque score points', () => {
    expect(getRecipeMatchBadgeLabel({ canCookNow: true, matchPercentage: 46 })).toBe('Nấu ngay');
    expect(getRecipeMatchBadgeLabel({ missingIngredientCount: 1, matchPercentage: 46 })).toBe('Thiếu 1 món');
    expect(getRecipeMatchBadgeLabel({ matchPercentage: 46 })).toBe('Phù hợp 46%');
  });

  it('combines ingredient quantities and availability status in one list', () => {
    const rows = buildRecipeIngredientRows({
      recipeName: 'Phở gà',
      ingredients: [
        { foodItemId: 1, foodName: 'Mì/bún/phở', grams: 180, calories: 0, protein: 0, carbs: 0, fat: 0 },
        { foodItemId: 2, foodName: 'Thịt gà', grams: 150, calories: 0, protein: 0, carbs: 0, fat: 0 },
      ],
      availableIngredients: ['Thịt gà'],
      missingIngredients: ['Mì/bún/phở'],
      extraIngredients: ['Sả'],
    });

    expect(rows).toEqual([
      { key: 'ingredient-1', name: 'Bánh phở', grams: 180, status: 'missing' },
      { key: 'ingredient-2', name: 'Thịt gà', grams: 150, status: 'available' },
      { key: 'extra-sa', name: 'Sả', status: 'extra' },
    ]);
  });

  it('normalizes generic ingredient aliases into recipe-specific display names', () => {
    const rows = buildRecipeIngredientRows({
      recipeName: 'Phở bò',
      ingredients: [
        { foodItemId: 1, foodName: 'Phở', grams: 180, calories: 0, protein: 0, carbs: 0, fat: 0 },
        { foodItemId: 2, foodName: 'Bò', grams: 150, calories: 0, protein: 0, carbs: 0, fat: 0 },
      ],
      availableIngredients: ['Bò'],
      missingIngredients: ['Phở'],
    });

    expect(rows).toEqual([
      { key: 'ingredient-1', name: 'Bánh phở', grams: 180, status: 'missing' },
      { key: 'ingredient-2', name: 'Thịt bò', grams: 150, status: 'available' },
    ]);
  });

  it('formats source URLs as readable source labels', () => {
    expect(formatRecipeSourceLabel('https://www.dienmayxanh.com/vao-bep/cach-nau-pho-ga')).toBe(
      'Điện Máy Xanh',
    );
    expect(formatRecipeSourceLabel('https://monngonmoingay.com/cong-thuc/pho-ga')).toBe(
      'Món Ngon Mỗi Ngày',
    );
  });
});
