import {
  getProfileCompletionDestination,
  hasProfileCompletionGaps,
} from '../src/app/screens/profile/profileCompletion';

describe('profile completion guidance', () => {
  it('keeps incomplete note hidden when profile has metrics and goal', () => {
    const profile = {
      id: 'user-1',
      weightKg: 70,
      heightCm: 170,
      goal: 'maintain',
    };

    expect(hasProfileCompletionGaps(profile)).toBe(false);
    expect(getProfileCompletionDestination(profile)).toBeNull();
  });

  it('sends users missing body metrics to BodyMetrics first', () => {
    const profile = {
      id: 'user-1',
      heightCm: 170,
      goal: 'maintain',
    };

    expect(hasProfileCompletionGaps(profile)).toBe(true);
    expect(getProfileCompletionDestination(profile)).toEqual({ route: 'BodyMetrics' });
  });

  it('sends users missing only goal to onboarding goal step', () => {
    const profile = {
      id: 'user-1',
      weightKg: 70,
      heightCm: 170,
    };

    expect(hasProfileCompletionGaps(profile)).toBe(true);
    expect(getProfileCompletionDestination(profile)).toEqual({
      route: 'Onboarding',
      params: { initialStep: 2 },
    });
  });
});
