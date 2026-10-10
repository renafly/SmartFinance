import commonEN from "../../locales/en/common.json";
import commonPT from "../../locales/pt/common.json";

import type { AppLanguage } from "./languages";

/**
 * Translation bundles for every supported language. Kept free of side
 * effects (unlike config/i18n.ts, which initializes i18next) so pure helpers
 * such as the default-category name lookup can read them, including in
 * unit tests.
 */
export const resources = {
  en: { common: commonEN },
  pt: { common: commonPT },
} satisfies Record<AppLanguage, { common: unknown }>;
