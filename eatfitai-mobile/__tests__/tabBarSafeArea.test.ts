import { resolveBottomTabSafePadding } from '../src/components/navigation/tabBarSafeArea';

describe('bottom tab safe-area padding', () => {
  it('keeps Android tabs above gesture/navigation bars even when the device reports no inset', () => {
    expect(resolveBottomTabSafePadding('android', 0)).toBe(16);
    expect(resolveBottomTabSafePadding('android', 4)).toBe(16);
  });

  it('uses larger Android bottom insets when the device reports them', () => {
    expect(resolveBottomTabSafePadding('android', 28)).toBe(28);
  });

  it('preserves iOS inset behavior', () => {
    expect(resolveBottomTabSafePadding('ios', 0)).toBe(0);
    expect(resolveBottomTabSafePadding('ios', 34)).toBe(34);
  });
});
