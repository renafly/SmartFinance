import { create } from 'zustand';
import i18next from 'i18next';
import { getStoredLanguage, setStoredLanguage, type AppLanguage } from '@/shared/i18n/languages';

export type AppCurrency = 'EUR' | 'USD' | 'GBP';

type PreferencesState = {
  language: AppLanguage;
  currency: AppCurrency;
  setLanguage: (language: AppLanguage) => void;
  setCurrency: (currency: AppCurrency) => void;
};

const fallbackLanguage: AppLanguage = getStoredLanguage() ?? 'en';

export const usePreferencesStore = create<PreferencesState>((set) => ({
  language: fallbackLanguage,
  currency: 'EUR',
  setLanguage: (language) => {
    setStoredLanguage(language);
    // eslint-disable-next-line import/no-named-as-default-member
    void i18next.changeLanguage(language);
    set({ language });
  },
  setCurrency: (currency) => {
    set({ currency });
  },
}));
