import {
  canShowMoChiTopOverlay,
  isMoChiBusy,
  useMoChiSurfaceCoordinator,
  type ActiveMoChiRenderedSurface,
} from '../src/features/mochi/mochiSurfaceCoordinator';

const makeSurface = (
  surface: ActiveMoChiRenderedSurface,
): ActiveMoChiRenderedSurface => surface;

describe('MoChi surface coordinator', () => {
  beforeEach(() => {
    useMoChiSurfaceCoordinator.setState({ active: {} });
  });

  it('blocks top overlays while a toast surface is active', () => {
    const unregister = useMoChiSurfaceCoordinator.getState().registerSurface(
      makeSurface({
        id: 'toast:1',
        surface: 'toast',
        priority: 80,
        blocks: ['topOverlay'],
      }),
    );

    expect(
      useMoChiSurfaceCoordinator
        .getState()
        .canShowTopOverlay('HomeTab', 'meal_reminder'),
    ).toBe(false);

    unregister();
    expect(
      useMoChiSurfaceCoordinator
        .getState()
        .canShowTopOverlay('HomeTab', 'meal_reminder'),
    ).toBe(true);
  });

  it('blocks top overlays for visible inline notices only on the same route', () => {
    const active = {
      'inline:stats': makeSurface({
        id: 'inline:stats',
        surface: 'inlineNotice',
        routeName: 'StatsTab',
        eventType: 'stats_low_data',
        priority: 60,
        blocks: ['topOverlay'],
      }),
    };

    expect(
      canShowMoChiTopOverlay({
        active,
        routeName: 'StatsTab',
        eventType: 'stats_low_data',
      }),
    ).toBe(false);
    expect(
      canShowMoChiTopOverlay({
        active,
        routeName: 'HomeTab',
        eventType: 'stats_low_data',
      }),
    ).toBe(true);
  });

  it('ignores expired surfaces and prunes them from the store', () => {
    const now = Date.now();
    useMoChiSurfaceCoordinator.getState().registerSurface(
      makeSurface({
        id: 'toast:expired',
        surface: 'toast',
        priority: 80,
        blocks: ['topOverlay'],
        expiresAt: now - 1,
      }),
    );

    expect(
      useMoChiSurfaceCoordinator
        .getState()
        .canShowTopOverlay('HomeTab', 'meal_reminder'),
    ).toBe(true);

    useMoChiSurfaceCoordinator.getState().pruneExpired(now);
    expect(useMoChiSurfaceCoordinator.getState().active).toEqual({});
  });

  it('does not treat the persistent bottom dock as a busy speaking surface', () => {
    const active = {
      'dock:main': makeSurface({
        id: 'dock:main',
        surface: 'bottomDock',
        priority: 10,
      }),
    };

    expect(isMoChiBusy(active)).toBe(false);
  });

  it('treats toast, overlay, and inline MoChi as a busy speaking surface', () => {
    expect(
      isMoChiBusy({
        'toast:meal': makeSurface({
          id: 'toast:meal',
          surface: 'toast',
          priority: 80,
        }),
      }),
    ).toBe(true);

    expect(
      isMoChiBusy({
        'overlay:daily-loop': makeSurface({
          id: 'overlay:daily-loop',
          surface: 'topOverlay',
          routeName: 'HomeTab',
          eventType: 'diary_review',
          priority: 70,
        }),
      }),
    ).toBe(true);

    expect(
      isMoChiBusy(
        {
          'inline:home': makeSurface({
            id: 'inline:home',
            surface: 'inlineNotice',
            routeName: 'HomeTab',
            eventType: 'diary_empty_today',
            priority: 60,
          }),
        },
        Date.now(),
        'HomeTab',
      ),
    ).toBe(true);
  });
});
