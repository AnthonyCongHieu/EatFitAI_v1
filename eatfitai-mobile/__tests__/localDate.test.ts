import { formatLocalDate } from '../src/utils/localDate';

describe('formatLocalDate', () => {
  it('returns the local calendar date without UTC drift', () => {
    const date = new Date(2026, 3, 1, 0, 30);

    expect(formatLocalDate(date)).toBe('2026-04-01');
  });
});

