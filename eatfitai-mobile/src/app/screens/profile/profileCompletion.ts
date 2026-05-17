import type { UserProfile } from '../../../services/profileService';

export const PROFILE_GOAL_ONBOARDING_STEP = 2;

export type ProfileCompletionDestination =
  | { route: 'BodyMetrics' }
  | { route: 'Onboarding'; params: { initialStep: number } };

export const hasProfileCompletionGaps = (profile: UserProfile | null | undefined): boolean =>
  Boolean(profile && (!profile.weightKg || !profile.heightCm || !profile.goal));

export const getProfileCompletionDestination = (
  profile: UserProfile | null | undefined,
): ProfileCompletionDestination | null => {
  if (!profile) {
    return null;
  }

  if (!profile.weightKg || !profile.heightCm) {
    return { route: 'BodyMetrics' };
  }

  if (!profile.goal) {
    return {
      route: 'Onboarding',
      params: { initialStep: PROFILE_GOAL_ONBOARDING_STEP },
    };
  }

  return null;
};
