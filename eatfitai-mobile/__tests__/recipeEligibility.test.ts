import {
  isFinishedDishLabel,
  isRecipeIngredientEligibleLabel,
} from '../src/utils/recipeEligibility';

describe('recipeEligibility', () => {
  it('keeps raw ingredient labels eligible for recipe matching', () => {
    expect(isRecipeIngredientEligibleLabel('chicken')).toBe(true);
    expect(isRecipeIngredientEligibleLabel('banh_trang')).toBe(true);
    expect(isRecipeIngredientEligibleLabel('garlic')).toBe(true);
  });

  it('classifies prepared dishes outside the ingredient basket', () => {
    expect(isRecipeIngredientEligibleLabel('pho')).toBe(false);
    expect(isFinishedDishLabel('pho')).toBe(true);
    expect(isFinishedDishLabel('fried_egg')).toBe(true);
  });

  it('does not treat unknown labels as finished dishes', () => {
    expect(isRecipeIngredientEligibleLabel('apple')).toBe(false);
    expect(isFinishedDishLabel('apple')).toBe(false);
  });
});
