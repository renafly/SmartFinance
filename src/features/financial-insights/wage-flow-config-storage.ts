// DEPRECATED / UNUSED: Wage Flow category config now lives in the
// `wage_flow_categories` Supabase table (see
// src/features/financial-insights/hooks/useWageFlowCategories.ts and
// src/features/financial-insights/services/wage-flow-categories.service.ts),
// not device-local storage. Nothing in the app imports this file anymore --
// kept only because it couldn't be deleted from this environment. Safe to
// delete by hand.
import { useCallback, useEffect, useRef, useState } from "react";

import { getPersistentString, setPersistentString } from "@/shared/lib/persistent-storage";

import {
  buildDefaultWageFlowConfig,
  createWageFlowCategoryId,
  type WageFlowAccount,
  type WageFlowCategory,
  type WageFlowCategoryConfig,
} from "./wage-flow";

function storageKey(householdId: string) {
  return `smartfinance:wage-flow:config:${householdId}`;
}

function isValidConfig(value: unknown): value is WageFlowCategoryConfig[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as WageFlowCategoryConfig).id === "string" &&
        typeof (item as WageFlowCategoryConfig).name === "string" &&
        Array.isArray((item as WageFlowCategoryConfig).accountIds) &&
        Array.isArray((item as WageFlowCategoryConfig).categoryIds) &&
        Array.isArray((item as WageFlowCategoryConfig).potAccountIds),
    )
  );
}

function readStoredConfig(householdId: string): WageFlowCategoryConfig[] | null {
  const raw = getPersistentString(storageKey(householdId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isValidConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The wage flow config is a per-device display preference (how to visualize
 * existing transactions), not shared ledger data -- it's stored locally
 * (localStorage on web, MMKV on native) the same way the Savings screen
 * persists its collapsed-group state, rather than in a new Supabase table.
 */
export function useWageFlowConfig(
  householdId: string | null | undefined,
  defaults: {
    accounts: WageFlowAccount[];
    categories: WageFlowCategory[];
    labels: {
      expenses: string;
      debtPayments: string;
      savingsAndGoals: string;
      discretionary: string;
    };
    ready: boolean;
  },
) {
  const [config, setConfigState] = useState<WageFlowCategoryConfig[]>([]);
  const hydratedForHousehold = useRef<string | null>(null);

  useEffect(() => {
    if (!householdId || !defaults.ready) return;
    if (hydratedForHousehold.current === householdId) return;

    const stored = readStoredConfig(householdId);
    setConfigState(
      stored ??
        buildDefaultWageFlowConfig({
          accounts: defaults.accounts,
          categories: defaults.categories,
          labels: defaults.labels,
        }),
    );
    hydratedForHousehold.current = householdId;
    // Only re-run when the household changes or defaults first become
    // ready -- once hydrated, `config` is the source of truth and further
    // changes to accounts/categories should not silently reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, defaults.ready]);

  const persist = useCallback(
    (next: WageFlowCategoryConfig[]) => {
      setConfigState(next);
      if (householdId) {
        setPersistentString(storageKey(householdId), JSON.stringify(next));
      }
    },
    [householdId],
  );

  const addCategory = useCallback(
    (category: Partial<WageFlowCategoryConfig> & Pick<WageFlowCategoryConfig, "name">) => {
      const newCategory: WageFlowCategoryConfig = {
        id: createWageFlowCategoryId(),
        colorToken: "#3B82F6",
        icon: "ellipse-outline",
        includeAllTransactions: false,
        accountIds: [],
        categoryIds: [],
        potAccountIds: [],
        includeTransfersBetweenAccounts: false,
        includeTransfersIntoPots: false,
        ...category,
      };
      persist([...config, newCategory]);
      return newCategory.id;
    },
    [config, persist],
  );

  const updateCategory = useCallback(
    (id: string, patch: Partial<WageFlowCategoryConfig>) => {
      persist(config.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    [config, persist],
  );

  const removeCategory = useCallback(
    (id: string) => {
      persist(config.filter((item) => item.id !== id));
    },
    [config, persist],
  );

  const moveCategory = useCallback(
    (id: string, direction: "up" | "down") => {
      const index = config.findIndex((item) => item.id === id);
      if (index === -1) return;
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= config.length) return;

      const next = [...config];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      persist(next);
    },
    [config, persist],
  );

  const resetToDefaults = useCallback(() => {
    persist(
      buildDefaultWageFlowConfig({
        accounts: defaults.accounts,
        categories: defaults.categories,
        labels: defaults.labels,
      }),
    );
  }, [defaults.accounts, defaults.categories, defaults.labels, persist]);

  return {
    config,
    setConfig: persist,
    addCategory,
    updateCategory,
    removeCategory,
    moveCategory,
    resetToDefaults,
  };
}
