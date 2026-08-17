/**
 * Which "group" a row belongs to for the Dashboard's 3D accounts network
 * config -- kept separate (never merged into one generic list) so a user
 * can independently include/exclude every-day accounts, investment
 * accounts, savings accounts, and saving pots. Mirrors the account-type
 * groupings already shown as separate metric cards/sections elsewhere on
 * the Dashboard (see `dashboard.investmentAccountsTitle` /
 * `savingsAccountsTitle` / `savingPotsTitle`).
 *
 * Persisted per-profile in the `dashboard_network_configs` Supabase table
 * (see `useDashboardNetworkConfig` in `hooks/useDashboardNetworkConfig.ts`
 * and `services/dashboard-network-config.service.ts`) -- a personal display
 * preference, like `profiles.theme` / `profiles.locale`, rather than shared
 * household data the way `wage_flow_categories` is. This file only holds
 * the pure, storage-agnostic helpers.
 */
export type DashboardNetworkConfig = {
  /** Every-day accounts: bank, cash, credit card -- anything that isn't an
   * investment/ppr or savings account. */
  accountIds: string[];
  /** Accounts of type `investment` or `ppr`. */
  investmentAccountIds: string[];
  /** Accounts of type `savings`. */
  savingsAccountIds: string[];
  /** Saving pots (the `saving_pots` table) -- a distinct entity from
   * accounts, tracked separately since a pot's balance is backed by (and
   * would double-count) money already shown on its assigned accounts. */
  potIds: string[];
};

export type DashboardNetworkConfigGroup = keyof DashboardNetworkConfig;

export type DashboardNetworkConfigAccount = { id: string; type: string };
export type DashboardNetworkConfigPot = { id: string };

/** Maps an account's `type` to the network config group it belongs to.
 * Every-day accounts (bank/cash/credit_card) fall back to `accountIds`. */
export function getAccountNetworkGroup(
  type: string,
): Exclude<DashboardNetworkConfigGroup, 'potIds'> {
  if (type === 'investment' || type === 'ppr') return 'investmentAccountIds';
  if (type === 'savings') return 'savingsAccountIds';
  return 'accountIds';
}

/** The starting config for a profile that has never customized the
 * network view: every known account and pot selected, matching the
 * network's previous (non-configurable) behavior of showing everything.
 * Used both as the fallback while `dashboard_network_configs` has no row
 * yet for this profile, and by the panel's "Show everything" reset. */
export function buildDefaultDashboardNetworkConfig(params: {
  accounts: DashboardNetworkConfigAccount[];
  pots: DashboardNetworkConfigPot[];
}): DashboardNetworkConfig {
  const config: DashboardNetworkConfig = {
    accountIds: [],
    investmentAccountIds: [],
    savingsAccountIds: [],
    potIds: params.pots.map((pot) => pot.id),
  };

  for (const account of params.accounts) {
    config[getAccountNetworkGroup(account.type)].push(account.id);
  }

  return config;
}

/** Keeps only the accounts whose id is selected in their type's group. */
export function filterAccountsByDashboardNetworkConfig<T extends DashboardNetworkConfigAccount>(
  accounts: T[],
  config: DashboardNetworkConfig,
): T[] {
  return accounts.filter((account) =>
    config[getAccountNetworkGroup(account.type)].includes(account.id),
  );
}

/** Keeps only the pots whose id is selected in `potIds`. */
export function filterPotsByDashboardNetworkConfig<T extends DashboardNetworkConfigPot>(
  pots: T[],
  config: DashboardNetworkConfig,
): T[] {
  return pots.filter((pot) => config.potIds.includes(pot.id));
}

/**
 * Drops any account already backing a saving pot from a list of accounts,
 * so Dashboard totals/cards/graphs built from account-type buckets
 * (every-day/investment/savings) never double-count a balance that's
 * already represented by that pot's own total. A pot's balance (see the
 * `saving_pot_balances` view) is the sum of its assigned accounts' entire
 * current balance, and each account can back at most one pot, so exclusion
 * is a simple set-membership check -- no partial allocation to reconcile.
 *
 * Deliberately narrower than "every account list in the Dashboard": Wage
 * Flow's account pickers intentionally keep listing every account (with its
 * pot shown as metadata) since "pot" means something different there --
 * only pass account lists that feed Dashboard totals/cards/graphs through
 * this helper.
 */
export function excludePotAssignedAccounts<T extends DashboardNetworkConfigAccount>(
  accounts: T[],
  potAssignedAccountIds: ReadonlySet<string> | Iterable<string>,
): T[] {
  const excluded =
    potAssignedAccountIds instanceof Set ? potAssignedAccountIds : new Set(potAssignedAccountIds);
  return accounts.filter((account) => !excluded.has(account.id));
}
