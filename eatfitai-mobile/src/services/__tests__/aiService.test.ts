import { normalizeMappedFoodItem } from '../aiService';

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
