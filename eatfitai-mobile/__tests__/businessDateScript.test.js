const {
  addDaysToDateOnly,
  isValidTimeZone,
  toBusinessDateOnly,
} = require('../scripts/lib/business-date');

describe('scripts business-date helper', () => {
  it('formats the same instant for Vietnam and New York business dates', () => {
    const instant = new Date('2026-04-25T17:05:00Z');

    expect(toBusinessDateOnly(instant, 'Asia/Ho_Chi_Minh')).toBe('2026-04-26');
    expect(toBusinessDateOnly(instant, 'America/New_York')).toBe('2026-04-25');
  });

  it('rejects invalid timezone ids', () => {
    expect(isValidTimeZone('Not/A_Timezone')).toBe(false);
  });

  it('shifts date-only values without runtime timezone drift', () => {
    expect(addDaysToDateOnly('2026-04-30', 1)).toBe('2026-05-01');
  });
});
