import {
  getVietnamesePortionPresets,
  normalizeVietnameseFoodText,
  rankVietnameseFoodName,
} from '../src/utils/vietnameseFoodSearch';

describe('vietnameseFoodSearch', () => {
  it('normalizes accents and Vietnamese d/đ safely', () => {
    expect(normalizeVietnameseFoodText('Cơm gà Đà Nẵng')).toBe('com ga da nang');
  });

  it('ranks unaccented synonym queries above weak matches', () => {
    expect(rankVietnameseFoodName('ga', 'Ức gà áp chảo')).toBeGreaterThan(
      rankVietnameseFoodName('ga', 'Cơm trắng'),
    );
  });

  it('returns domain portion presets for Vietnamese staples', () => {
    expect(getVietnamesePortionPresets('phở bò')).toEqual([
      { label: 'Ít', grams: 150 },
      { label: 'Vừa', grams: 250 },
      { label: 'Nhiều', grams: 350 },
    ]);
  });
});
