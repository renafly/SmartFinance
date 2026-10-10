import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import { getStoredLanguage, normalizeLanguage } from '@/shared/i18n/languages';
import { resources } from '@/shared/i18n/resources';

// eslint-disable-next-line import/no-named-as-default-member
i18next.use(initReactI18next).init({
  resources,
  lng:
    getStoredLanguage() ??
    normalizeLanguage(Localization.getLocales()[0]?.languageCode) ??
    'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18next;
