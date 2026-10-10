import * as fs from "fs";
import * as path from "path";
import i18next from "i18next";

import { resources } from "@/shared/i18n/resources";
import {
  getDefaultCategoryKey,
  localizeCategory,
  normalizeCategoryName,
  translateCategoryName,
} from "./category-names";

type CatalogEntry = { key: string; parentKey: string | null; type: string; nameEn: string; namePt: string };

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../supabase/migrations");

// The newest migration that (re)defines default_category_catalog() is the
// one the database runs, so read that one.
function readDatabaseCatalog(): CatalogEntry[] {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const latest = files
    .filter((file) =>
      /create\s+or\s+replace\s+function\s+public\.default_category_catalog\s*\(/i.test(
        fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"),
      ),
    )
    .pop();
  if (!latest) throw new Error("No migration defines public.default_category_catalog()");

  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, latest), "utf8");
  const body = sql.split(/from\s*\(values/i)[1]?.split(/\)\s*as\s+v\s*\(/i)[0] ?? "";
  const sqlString = "'((?:[^']|'')*)'";
  const row = new RegExp(
    `^\\s*\\(${sqlString},\\s*(null(?:::text)?|${sqlString}),\\s*${sqlString},\\s*${sqlString},\\s*${sqlString}`,
    "gm",
  );
  const unquote = (value: string) => value.replace(/''/g, "'");

  return Array.from(body.matchAll(row), (match) => ({
    key: match[1],
    parentKey: match[3] === undefined ? null : unquote(match[3]),
    type: match[4],
    nameEn: unquote(match[5]),
    namePt: unquote(match[6]),
  }));
}

function localeDefaults(language: keyof typeof resources): Record<string, string> {
  return (resources[language].common as { categories: { defaults: Record<string, string> } }).categories
    .defaults;
}

describe("default category translations", () => {
  const catalog = readDatabaseCatalog();
  const languages = Object.keys(resources) as (keyof typeof resources)[];

  it("reads the whole catalog from the migration", () => {
    expect(catalog.length).toBeGreaterThanOrEqual(76);
    expect(new Set(catalog.map((entry) => entry.key)).size).toBe(catalog.length);
    // every subcategory points at a main category in the catalog
    const keys = new Set(catalog.map((entry) => entry.key));
    for (const entry of catalog) {
      if (entry.parentKey) expect(keys.has(entry.parentKey)).toBe(true);
    }
  });

  it.each(languages)("has a name for every catalog category in %s, and nothing else", (language) => {
    const defaults = localeDefaults(language);
    expect(Object.keys(defaults).sort()).toEqual(catalog.map((entry) => entry.key).sort());
    for (const value of Object.values(defaults)) {
      expect(typeof value).toBe("string");
      expect(value.trim()).not.toBe("");
    }
  });

  it("uses exactly the database catalog's names", () => {
    const en = localeDefaults("en");
    const pt = localeDefaults("pt");
    for (const entry of catalog) {
      expect({ key: entry.key, en: en[entry.key], pt: pt[entry.key] }).toEqual({
        key: entry.key,
        en: entry.nameEn,
        pt: entry.namePt,
      });
    }
  });

  it("never maps one name to two categories", () => {
    const owner = new Map<string, string>();
    for (const language of languages) {
      for (const [key, label] of Object.entries(localeDefaults(language))) {
        const normalized = normalizeCategoryName(label);
        expect([undefined, key]).toContain(owner.get(normalized));
        owner.set(normalized, key);
      }
    }
  });
});

describe("translateCategoryName", () => {
  const i18n = i18next.createInstance();
  void i18n.init({ resources, lng: "en", fallbackLng: "en", defaultNS: "common", ns: ["common"] });
  const tEn = i18n.getFixedT("en", "common");
  const tPt = i18n.getFixedT("pt", "common");

  it("translates a default stored in either language into the current one", () => {
    expect(translateCategoryName("Habitação", tEn)).toBe("Housing");
    expect(translateCategoryName("Housing", tPt)).toBe("Habitação");
    expect(translateCategoryName("Compras de Mercearia", tEn)).toBe("Groceries");
    expect(translateCategoryName("Kids' Activities", tPt)).toBe("Atividades para Crianças");
    expect(translateCategoryName("Outros Rendimentos", tEn)).toBe("Other Income");
  });

  it("ignores case and surrounding/double whitespace", () => {
    expect(translateCategoryName("  rent &  mortgage ", tPt)).toBe("Renda & Crédito Habitação");
    expect(getDefaultCategoryKey("SALÁRIO")).toBe("salary");
  });

  it("leaves custom and renamed categories exactly as stored", () => {
    expect(translateCategoryName("Holiday fund 2027", tEn)).toBe("Holiday fund 2027");
    expect(translateCategoryName("Mercearia do bairro", tEn)).toBe("Mercearia do bairro");
    expect(getDefaultCategoryKey("Holiday fund 2027")).toBeNull();
  });

  it("passes null/undefined through", () => {
    expect(translateCategoryName(null, tEn)).toBeNull();
    expect(translateCategoryName(undefined, tEn)).toBeNull();
  });
});

describe("localizeCategory", () => {
  const i18n = i18next.createInstance();
  void i18n.init({ resources, lng: "en", fallbackLng: "en", defaultNS: "common", ns: ["common"] });

  it("only changes the display name and keeps the stored one", () => {
    const row = {
      id: "c1",
      name: "Supermercado",
      parent_id: "p1",
      icon: "basket-outline",
      sort_order: 0,
      type: "expense",
      is_default: true,
    };
    expect(localizeCategory(row, i18n.getFixedT("en", "common"))).toEqual({
      ...row,
      name: "Supermarket",
      stored_name: "Supermercado",
    });
    expect(localizeCategory(row, i18n.getFixedT("pt", "common")).name).toBe("Supermercado");
  });
});
