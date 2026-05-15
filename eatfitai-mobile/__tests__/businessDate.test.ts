import {
  addDaysToDateOnly,
  DEFAULT_BUSINESS_TIME_ZONE,
  daysBetweenDateOnly,
  formatBusinessDate,
  setBusinessTimeZoneId,
  isValidTimeZone,
  resolveBusinessTimeZone,
} from '../src/utils/businessDate';

describe('businessDate', () => {
  it('formats UTC instant as Vietnam business date without UTC drift', () => {
    const instant = new Date('2026-04-25T17:05:00Z');

    expect(formatBusinessDate(instant, DEFAULT_BUSINESS_TIME_ZONE)).toBe('2026-04-26');
  });

  it('formats the same instant for a non-Vietnam user timezone', () => {
    const instant = new Date('2026-04-25T17:05:00Z');

    expect(formatBusinessDate(instant, 'America/New_York')).toBe('2026-04-25');
  });

  it('rejects invalid IANA timezone ids', () => {
    expect(isValidTimeZone('Not/A_Timezone')).toBe(false);
  });

  it('falls back to a valid timezone for invalid input', () => {
    expect(isValidTimeZone(resolveBusinessTimeZone('Not/A_Timezone'))).toBe(true);
  });

  it('uses configured user timezone when no explicit timezone is passed', () => {
    setBusinessTimeZoneId('America/New_York');
    expect(formatBusinessDate(new Date('2026-04-25T17:05:00Z'))).toBe('2026-04-25');
    setBusinessTimeZoneId(DEFAULT_BUSINESS_TIME_ZONE);
  });

  it('adds days to YYYY-MM-DD without using local runtime timezone', () => {
    expect(addDaysToDateOnly('2026-04-30', 1)).toBe('2026-05-01');
    expect(addDaysToDateOnly('2026-05-01', -1)).toBe('2026-04-30');
  });

  it('calculates date-only day differences without local timezone offsets', () => {
    expect(daysBetweenDateOnly('2026-04-30', '2026-05-03')).toBe(3);
  });
});
