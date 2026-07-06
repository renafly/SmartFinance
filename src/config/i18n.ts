import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import commonEN from '../locales/en/common.json';
import commonPT from '../locales/pt/common.json';

const resources = {
  en: { common: commonEN },
  pt: { common: commonPT },
};

i18next.use(initReactI18next).init({
  resources,
  lng: Localization.getLocales()[0]?.languageCode ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18next;
