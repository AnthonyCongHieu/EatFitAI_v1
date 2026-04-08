import {
  filterFoodsByPreferences,
  getActiveFoodFilterLabels,
} from '../src/utils/foodPreferenceFilter';
import type { FoodItem } from '../src/services/foodService';
import type { UserPreference } from '../src/app/types';

const makeFood = (overrides: Partial<FoodItem>): FoodItem => ({
  id: overrides.id ?? '1',
  name: overrides.name ?? 'Food item',
  nameEn: overrides.nameEn ?? null,
  brand: overrides.brand ?? null,
  calories: overrides.calories ?? null,
  protein: overrides.protein ?? null,
  carbs: overrides.carbs ?? null,
  fat: overrides.fat ?? null,
  thumbnail: overrides.thumbnail ?? null,
  isActive: overrides.isActive ?? true,
  createdAt: overrides.createdAt ?? null,
  updatedAt: overrides.updatedAt ?? null,
  source: overrides.source ?? 'catalog',
});

const makePreferences = (overrides: Partial<UserPreference>): UserPreference => ({
  dietaryRestrictions: overrides.dietaryRestrictions ?? [],
  allergies: overrides.allergies ?? [],
  preferredMealsPerDay: overrides.preferredMealsPerDay ?? 3,
  preferredCuisine: overrides.preferredCuisine ?? null,
});

describe('foodPreferenceFilter', () => {
  it('returns the original list when the user has no preferences', () => {
    const foods = [
      makeFood({ id: '1', name: 'Chicken breast', protein: 31 }),
      makeFood({ id: '2', name: 'Rice bowl', carbs: 28 }),
    ];

    const result = filterFoodsByPreferences(foods, makePreferences({}));

    expect(result.items).toEqual(foods);
    expect(result.excludedCount).toBe(0);
    expect(result.appliedLabels).toEqual([]);
  });

  it('removes meat dishes for vegetarian users', () => {
    const foods = [
      makeFood({ id: '1', name: 'Thit bo nuong', protein: 26 }),
      makeFood({ id: '2', name: 'Dau hu sot ca chua', protein: 9 }),
    ];

    const result = filterFoodsByPreferences(
      foods,
      makePreferences({ dietaryRestrictions: ['vegetarian'] }),
    );

    expect(result.items.map((item) => item.id)).toEqual(['2']);
    expect(result.excludedCount).toBe(1);
    expect(result.appliedLabels).toEqual(['\u0102n chay']);
  });

  it('removes pork dishes for no-pork preference using English names too', () => {
    const foods = [
      makeFood({ id: '1', name: 'Roasted pork belly', protein: 18 }),
      makeFood({ id: '2', name: 'Chicken salad', protein: 20 }),
    ];

    const result = filterFoodsByPreferences(
      foods,
      makePreferences({ dietaryRestrictions: ['no-pork'] }),
    );

    expect(result.items.map((item) => item.id)).toEqual(['2']);
  });

  it('applies low-carb and high-protein filters using macros when available', () => {
    const foods = [
      makeFood({ id: '1', name: 'Rice bowl', carbs: 35, protein: 4 }),
      makeFood({ id: '2', name: 'Chicken breast', carbs: 0, protein: 31 }),
      makeFood({ id: '3', name: 'Milk tea', carbs: 18, protein: 1 }),
    ];

    const result = filterFoodsByPreferences(
      foods,
      makePreferences({ dietaryRestrictions: ['low-carb', 'high-protein'] }),
    );

    expect(result.items.map((item) => item.id)).toEqual(['2']);
    expect(result.appliedLabels).toEqual(['\u00cdt tinh b\u1ed9t', 'Gi\u00e0u protein']);
  });

  it('removes foods that match allergy keywords', () => {
    const foods = [
      makeFood({ id: '1', name: 'Tom rim', protein: 20 }),
      makeFood({ id: '2', name: 'Ca rot luoc', protein: 1 }),
    ];

    const result = filterFoodsByPreferences(
      foods,
      makePreferences({ allergies: ['seafood'] }),
    );

    expect(result.items.map((item) => item.id)).toEqual(['2']);
    expect(result.excludedCount).toBe(1);
  });

  it('reports labels for active filters in a stable order', () => {
    const labels = getActiveFoodFilterLabels(
      makePreferences({
        dietaryRestrictions: ['halal', 'no-beef'],
        allergies: ['dairy'],
      }),
    );

    expect(labels).toEqual([
      'Halal',
      'Kh\u00f4ng \u0103n b\u00f2',
      'D\u1ecb \u1ee9ng s\u1eefa',
    ]);
  });
});
