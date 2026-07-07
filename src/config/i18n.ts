import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import commonEN from '../locales/en/common.json';
import commonPT from '../locales/pt/common.json';
import { getStoredLanguage, normalizeLanguage } from '@/shared/i18n/languages';

const resources = {
  en: { common: commonEN },
  pt: { common: commonPT },
};

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
