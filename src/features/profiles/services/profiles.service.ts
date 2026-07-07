import { repositories } from '@/repositories';
import type { AppCurrency } from '@/stores/preferencesStore';

class ProfilesService {
  async updatePreferredCurrency(profileId: string, currency: AppCurrency) {
    const { data, error } = await repositories.profiles.update(profileId, {
      preferred_currency: currency,
    });

    if (error) throw error;

    return data;
  }
}

export const profilesService = new ProfilesService();
