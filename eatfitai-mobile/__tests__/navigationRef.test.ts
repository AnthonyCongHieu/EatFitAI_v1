const mockNavigationRef = {
  isReady: jest.fn(),
  getRootState: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => mockNavigationRef,
}));

describe('navigationRef weekly review navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not report success before AppTabs is mounted', () => {
    mockNavigationRef.isReady.mockReturnValue(true);
    mockNavigationRef.getRootState.mockReturnValue({
      index: 0,
      routes: [{ name: 'Login' }],
    });

    const {
      navigateToStatsWeeklyReview,
    } = require('../src/app/navigation/navigationRef') as typeof import('../src/app/navigation/navigationRef');

    expect(navigateToStatsWeeklyReview()).toBe(false);
    expect(mockNavigationRef.navigate).not.toHaveBeenCalled();
  });

  it('navigates to StatsTab weekly review when AppTabs is mounted', () => {
    mockNavigationRef.isReady.mockReturnValue(true);
    mockNavigationRef.getRootState.mockReturnValue({
      index: 0,
      routes: [{ name: 'AppTabs' }],
    });

    const {
      navigateToStatsWeeklyReview,
    } = require('../src/app/navigation/navigationRef') as typeof import('../src/app/navigation/navigationRef');

    expect(navigateToStatsWeeklyReview()).toBe(true);
    expect(mockNavigationRef.navigate).toHaveBeenCalledWith('AppTabs', {
      screen: 'StatsTab',
      params: {
        source: 'weekly-review',
        focusWeeklyReview: true,
      },
    });
  });
});
