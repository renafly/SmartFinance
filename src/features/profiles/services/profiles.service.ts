import { repositories } from '@/repositories';
import type { OnboardingGuides } from '@/repositories/profiles.repository';
import type { AppCurrency } from '@/stores/preferencesStore';

export type OnboardingGuideDefinition = {
  key: string;
  version: number;
};

export function getCompletedGuideVersion(
  guides: OnboardingGuides,
  guideKey: string,
) {
  return guides[guideKey] ?? 0;
}

export function shouldShowOnboardingGuide(
  guides: OnboardingGuides,
  guide: OnboardingGuideDefinition,
) {
  return getCompletedGuideVersion(guides, guide.key) < guide.version;
}

class ProfilesService {
  async updatePreferredCurrency(profileId: string, currency: AppCurrency) {
    const { data, error } = await repositories.profiles.update(profileId, {
      preferred_currency: currency,
    });

    if (error) throw error;

    return data;
  }

  async getOnboardingGuides() {
    const { data, error } = await repositories.profiles.getCurrentOnboardingGuides();

    if (error) throw error;
    return data;
  }

  async completeOnboardingGuide(guide: OnboardingGuideDefinition) {
    if (!Number.isInteger(guide.version) || guide.version < 1) {
      throw new Error('Guide version must be a positive integer.');
    }

    const { data, error } = await repositories.profiles.completeOnboardingGuide(
      guide.key,
      guide.version,
    );

    if (error) throw error;
    return data;
  }
}

export const profilesService = new ProfilesService();
