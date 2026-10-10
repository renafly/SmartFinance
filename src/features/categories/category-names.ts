import { resources } from "@/shared/i18n/resources";

/** The `t` from useTranslation("common") (same shape transfers/utils.ts uses). */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Display names for the default categories.
 *
 * A category row stores ONE name, written in the household owner's language
 * when the defaults were seeded (apply_default_categories in
 * supabase/migrations/20261007000000_default_categories_v2.sql). That is why
 * a Portuguese household showed "Habitação" to an English-speaking member,
 * and why switching the app language never changed category names.
 *
 * The fix is to translate at display time: a stored name that is the
 * English or Portuguese name of a default category (catalog key `housing`,
 * `groceries`, ...) is shown as `categories.defaults.<key>` in the current
 * language. Anything else -- custom categories, and defaults the household
 * renamed -- is shown exactly as stored.
 *
 * The names live in the locale files (`categories.defaults`) and must match
 * default_category_catalog() in the database; category-names.unit.test.ts
 * enforces that.
 */

export const DEFAULT_CATEGORY_TRANSLATION_PREFIX = "categories.defaults";

export function normalizeCategoryName(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

let nameToKey: Map<string, string> | null = null;

function getNameToKey(): Map<string, string> {
  if (nameToKey) return nameToKey;

  const lookup = new Map<string, string>();
  for (const bundle of Object.values(resources)) {
    const defaults = (bundle.common as { categories?: { defaults?: Record<string, string> } })
      .categories?.defaults ?? {};
    for (const [key, label] of Object.entries(defaults)) {
      lookup.set(normalizeCategoryName(label), key);
    }
  }

  nameToKey = lookup;
  return lookup;
}

/** Catalog key of a default category, from its stored name in any supported language. */
export function getDefaultCategoryKey(name: string | null | undefined): string | null {
  if (!name) return null;
  return getNameToKey().get(normalizeCategoryName(name)) ?? null;
}

/** The name to show for a category in the current language. */
export function translateCategoryName(name: string, t: Translate): string;
export function translateCategoryName(
  name: string | null | undefined,
  t: Translate,
): string | null;
export function translateCategoryName(
  name: string | null | undefined,
  t: Translate,
): string | null {
  if (name == null) return null;
  const key = getDefaultCategoryKey(name);
  if (!key) return name;
  return t(`${DEFAULT_CATEGORY_TRANSLATION_PREFIX}.${key}`, { defaultValue: name });
}

export type LocalizedCategory<T extends { name: string }> = T & {
  /** The name exactly as stored in the database (send this back on update when the user didn't rename). */
  stored_name: string;
};

/** Copy of `category` whose `name` is the display name in the current language. */
export function localizeCategory<T extends { name: string }>(
  category: T,
  t: Translate,
): LocalizedCategory<T> {
  return {
    ...category,
    name: translateCategoryName(category.name, t),
    stored_name: category.name,
  };
}
