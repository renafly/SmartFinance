import type { InsightTransaction } from "./types";

/**
 * A broad, fixed palette of hex colors a flow category can use -- shown as
 * swatches in the category color picker. These are plain hex values (not
 * theme tokens) so there's enough variety for many custom categories; they
 * were chosen to read reasonably against both light and dark surfaces.
 */
export const WAGE_FLOW_COLOR_PALETTE = [
  "#EF4444", // red
  "#F97316", // orange
  "#F59E0B", // amber
  "#EAB308", // yellow
  "#84CC16", // lime
  "#22C55E", // green
  "#10B981", // emerald
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#0EA5E9", // sky
  "#3B82F6", // blue
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#A855F7", // purple
  "#D946EF", // fuchsia
  "#EC4899", // pink
  "#F43F5E", // rose
  "#78716C", // stone
] as const;

/** Semantic theme-token names used by categories created before the
 * expanded color palette above -- kept only so `resolveWageFlowColor` can
 * still render categories saved to a device before this change. */
export const WAGE_FLOW_LEGACY_COLOR_TOKENS = [
  "financialNegative",
  "financialAttention",
  "financialGoal",
  "financialNeutral",
  "financialPositive",
  "warning",
  "info",
  "destructive",
] as const;

export type WageFlowColorToken = string;

/** Resolves a category's stored color to a displayable value: a hex string
 * (the current palette) is returned as-is, a legacy theme-token name (e.g.
 * "financialNeutral") is looked up in the active theme, and anything
 * unrecognized falls back to the given default. */
export function resolveWageFlowColor(
  value: string,
  themeColors: Record<string, string | undefined>,
  fallback: string,
): string {
  if (value.startsWith("#")) return value;
  return themeColors[value] ?? fallback;
}

/**
 * A single user-configurable "flow category". Matching is a plain OR across
 * whichever criteria are populated -- a transaction (or transfer leg) is
 * claimed by this category if it satisfies ANY of them. See
 * `calculateWageFlow` for the exact semantics of each field.
 *
 * Categories are matched against transactions in array order and the FIRST
 * category that matches claims it (first-match-wins). This is what makes
 * "reorder" meaningful: put narrow/specific categories first and broad
 * catch-alls (like `includeAllTransactions`) last.
 */
export type WageFlowCategoryConfig = {
  id: string;
  name: string;
  colorToken: WageFlowColorToken;
  /** Ionicons glyph name, kept as a plain string so this module has no
   * dependency on react-native / @expo/vector-icons. */
  icon: string;
  /** Matches every non-transfer expense, regardless of account/category.
   * Intended as a catch-all -- put it last. */
  includeAllTransactions: boolean;
  /** Matches non-transfer expenses spent FROM these accounts, and incoming
   * transfer legs landing INTO these accounts (e.g. a credit card account:
   * catches both direct card purchases and transfers that pay it down). */
  accountIds: string[];
  /** Matches non-transfer expenses in these categories. Selecting a main
   * category automatically includes its subcategories, consistent with
   * category filtering elsewhere in the app. This is always an explicit,
   * one-time list of category ids -- a category created after this rule was
   * saved is not picked up automatically; see `buildOneWageFlowCategoryPerMainCategory`
   * for the bulk "one Wage Flow category per main category" action, which is
   * also a one-time snapshot rather than a standing rule. */
  categoryIds: string[];
  /** Matches incoming transfer legs landing on these specific pot/savings
   * accounts (lets a user track individual named pots separately). */
  potAccountIds: string[];
  /** Matches any incoming transfer leg landing on a non-pot account (bank,
   * cash, or credit card) -- a broad "money moved between my accounts"
   * catch-all that isn't scoped to specific accounts. */
  includeTransfersBetweenAccounts: boolean;
  /** Matches any incoming transfer leg landing on a savings/investment/ppr
   * account -- a broad "money moved into savings" catch-all that isn't
   * scoped to specific pots. */
  includeTransfersIntoPots: boolean;
};

export type WageFlowMatchedTransaction = {
  id: string;
  title: string;
  /** Signed relative to the category's tracked account(s): positive when
   * money arrived (income received into a tracked account, or an incoming
   * transfer leg), negative when money left (an expense paid from a tracked
   * account, or an outgoing transfer leg). For category-only matches
   * (`categoryIds` / `includeAllTransactions`, which aren't tied to a
   * specific account) this is always positive -- it's a plain spend amount,
   * not an account balance, so there's no "opposite direction" to net
   * against. */
  amount: number;
  transactionDate: string;
  accountId: string;
  isTransfer: boolean;
};

export type WageFlowCategoryResult = {
  id: string;
  name: string;
  colorToken: WageFlowColorToken;
  icon: string;
  amount: number;
  /** Share of total income, 0-100 (not clamped). */
  share: number;
  /** The actual transactions/transfer legs this category claimed, most
   * recent first -- powers the "which transfers funded this pot" drill-down. */
  matches: WageFlowMatchedTransaction[];
};

export type WageFlowReport = {
  income: number;
  totalAllocated: number;
  /** income - totalAllocated, floored at 0. */
  unallocated: number;
  categories: WageFlowCategoryResult[];
};

export type WageFlowAccount = {
  id: string;
  /** bank | cash | savings | credit_card | investment | ppr */
  type: string;
};

export type WageFlowCategory = {
  id: string;
  parent_id?: string | null;
  is_discretionary?: boolean | null;
};

export type WageFlowRange = { from?: string; to?: string };

const POT_ACCOUNT_TYPES = new Set(["savings", "investment", "ppr"]);

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function inRange(dateString: string, range: WageFlowRange) {
  const date = dateString.slice(0, 10);
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

/** Expands a set of selected category ids to also include their direct
 * subcategories, reusing the existing `parent_id` hierarchy rather than
 * hardcoding any parent/child relationship. */
function expandCategoryIds(
  categoryIds: string[],
  categories: WageFlowCategory[],
): Set<string> {
  if (categoryIds.length === 0) return new Set();

  const result = new Set(categoryIds);

  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parent_id) continue;
    const list = childrenByParent.get(category.parent_id) ?? [];
    list.push(category.id);
    childrenByParent.set(category.parent_id, list);
  }

  for (const id of categoryIds) {
    for (const childId of childrenByParent.get(id) ?? []) {
      result.add(childId);
    }
  }

  return result;
}

function toMatch(
  item: InsightTransaction,
  isTransfer: boolean,
  signedAmount: number,
): WageFlowMatchedTransaction {
  return {
    id: item.id,
    title: item.title,
    amount: signedAmount,
    transactionDate: item.transaction_date,
    accountId: item.account_id,
    isTransfer,
  };
}

/**
 * Buckets a household's transactions into a fully user-configurable "wage
 * flow": how income for the period moved through whichever categories the
 * household has defined (expenses, debt payments, savings/pots,
 * discretionary spending, or anything else they've set up).
 *
 * Sign / direction rules:
 *  - The household's top-line `income` figure is always the sum of
 *    non-transfer income in range, regardless of category config -- internal
 *    transfers never inflate it.
 *  - For criteria tied to a specific account or pot (`accountIds`,
 *    `potAccountIds`, and the broad `includeTransfersBetweenAccounts` /
 *    `includeTransfersIntoPots` toggles), a category's amount is a true NET
 *    balance contribution for that account: money arriving is positive
 *    (a transfer landing on the account, or non-transfer income paid
 *    directly into it) and money leaving is negative (a transfer out of the
 *    account, or a non-transfer expense paid from it). This applies
 *    identically whether the account is a bank/cash account, a credit card,
 *    or a savings/investment/ppr pot -- e.g. a savings account with a
 *    EUR1,000 transfer in and a later EUR200 expense/outgoing transfer nets
 *    to EUR800, not EUR1,000 (the outgoing leg is subtracted, never ignored
 *    and never added as if it were also an inflow).
 *  - For criteria that aren't tied to a specific account (`categoryIds`,
 *    `includeAllTransactions`), the amount stays a plain positive expense
 *    magnitude -- "how much was spent in this category" has no account to
 *    net a direction against.
 *  - Both legs of a transfer are now evaluated (previously only the
 *    incoming leg was counted and the outgoing leg was skipped entirely).
 *    Each leg is still matched independently and claimed by at most one
 *    category (first-match-wins), so a transfer can never inflate the
 *    household's overall income or spending: the two legs either land in the
 *    same category and net to zero, or land in different categories as a
 *    negative (source) and positive (destination) pair that still nets to
 *    zero across the whole report.
 *  - Categories are matched in array order; the first category whose rules
 *    match a transaction/leg claims it.
 */
export function calculateWageFlow(params: {
  transactions: InsightTransaction[];
  accounts: WageFlowAccount[];
  categories: WageFlowCategory[];
  config: WageFlowCategoryConfig[];
  range?: WageFlowRange;
}): WageFlowReport {
  const { transactions, accounts, categories, config, range = {} } = params;
  const accountTypeById = new Map(accounts.map((account) => [account.id, account.type]));
  const isPotAccount = (accountId: string) => {
    const accountType = accountTypeById.get(accountId);
    return accountType ? POT_ACCOUNT_TYPES.has(accountType) : false;
  };

  let income = 0;
  const entries = config.map((cfg) => ({
    cfg,
    expandedCategoryIds: expandCategoryIds(cfg.categoryIds, categories),
    accountIdSet: new Set(cfg.accountIds),
    potAccountIdSet: new Set(cfg.potAccountIds),
    amount: 0,
    matches: [] as WageFlowMatchedTransaction[],
  }));

  /** True when this category tracks the given account specifically (via
   * `accountIds`/`potAccountIds`) or via one of the broad account-type
   * toggles -- i.e. whenever this category's amount represents that
   * account's net balance contribution rather than a plain spend total. */
  const matchesTrackedAccount = (
    entry: (typeof entries)[number],
    accountId: string,
  ) => {
    const { cfg } = entry;
    if (entry.potAccountIdSet.has(accountId) || entry.accountIdSet.has(accountId)) {
      return true;
    }
    const isPot = isPotAccount(accountId);
    if (cfg.includeTransfersIntoPots && isPot) return true;
    if (cfg.includeTransfersBetweenAccounts && !isPot) return true;
    return false;
  };

  for (const item of transactions) {
    if (!inRange(item.transaction_date, range)) continue;

    const isTransferLeg = !!item.transfer_group_id;

    if (item.type === "income" && !isTransferLeg) {
      income += item.amount;

      // Direct (non-transfer) income paid straight into a tracked account
      // still counts toward that account's net contribution, e.g. interest
      // or a deposit made directly into a savings pot.
      for (const entry of entries) {
        if (matchesTrackedAccount(entry, item.account_id)) {
          entry.amount += item.amount;
          entry.matches.push(toMatch(item, false, item.amount));
          break;
        }
      }
      continue;
    }

    if (isTransferLeg) {
      // The incoming leg (type "income") means money arrived on this
      // account -- positive. The outgoing leg (type "expense") means money
      // left this account -- negative. Evaluating both, each independently
      // matched against the same tracked-account rules, is what turns this
      // into a true net balance contribution instead of a one-directional
      // sum.
      const sign = item.type === "income" ? 1 : -1;

      for (const entry of entries) {
        if (matchesTrackedAccount(entry, item.account_id)) {
          entry.amount += sign * item.amount;
          entry.matches.push(toMatch(item, true, sign * item.amount));
          break;
        }
      }
      continue;
    }

    if (item.type !== "expense") continue;

    for (const entry of entries) {
      const { cfg } = entry;
      const matchesCategory = item.category_id
        ? entry.expandedCategoryIds.has(item.category_id)
        : false;

      if (matchesTrackedAccount(entry, item.account_id)) {
        // Scoped to a specific tracked account/pot (or a broad account-type
        // toggle) -- an expense paid from it is an outflow, so it subtracts
        // from that account's net contribution, the same as an outgoing
        // transfer would.
        entry.amount -= item.amount;
        entry.matches.push(toMatch(item, false, -item.amount));
        break;
      }

      if (cfg.includeAllTransactions || matchesCategory) {
        // Not tied to a specific account -- a plain spend total, unsigned.
        entry.amount += item.amount;
        entry.matches.push(toMatch(item, false, item.amount));
        break;
      }
    }
  }

  const totalAllocated = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const share = (amount: number) => (income > 0 ? roundMoney((amount / income) * 100) : 0);

  return {
    income: roundMoney(income),
    totalAllocated: roundMoney(totalAllocated),
    unallocated: roundMoney(Math.max(0, income - totalAllocated)),
    categories: entries.map((entry) => ({
      id: entry.cfg.id,
      name: entry.cfg.name,
      colorToken: entry.cfg.colorToken,
      icon: entry.cfg.icon,
      amount: roundMoney(entry.amount),
      share: share(entry.amount),
      matches: [...entry.matches].sort((a, b) =>
        b.transactionDate.localeCompare(a.transactionDate),
      ),
    })),
  };
}

/**
 * Produces the starting set of flow categories, computed from the
 * household's real accounts/categories (never hardcoded ids). Mirrors the
 * previous fixed account-type-based mapping so existing users see the same
 * breakdown by default, but every field here is now just an editable
 * starting point -- the user can rename, edit, reorder, remove, or add to
 * these freely from that point on.
 */
export function buildDefaultWageFlowConfig(params: {
  accounts: WageFlowAccount[];
  categories: WageFlowCategory[];
  labels: {
    expenses: string;
    debtPayments: string;
    savingsAndGoals: string;
    discretionary: string;
  };
}): WageFlowCategoryConfig[] {
  const { accounts, categories, labels } = params;
  const creditCardAccountIds = accounts
    .filter((account) => account.type === "credit_card")
    .map((account) => account.id);
  const discretionaryCategoryIds = categories
    .filter((category) => !!category.is_discretionary)
    .map((category) => category.id);

  return [
    {
      id: "discretionary",
      name: labels.discretionary,
      colorToken: "#8B5CF6",
      icon: "sparkles-outline",
      includeAllTransactions: false,
      accountIds: [],
      categoryIds: discretionaryCategoryIds,
      potAccountIds: [],
      includeTransfersBetweenAccounts: false,
      includeTransfersIntoPots: false,
    },
    {
      id: "debt-payments",
      name: labels.debtPayments,
      colorToken: "#F59E0B",
      icon: "card-outline",
      includeAllTransactions: false,
      accountIds: creditCardAccountIds,
      categoryIds: [],
      potAccountIds: [],
      includeTransfersBetweenAccounts: false,
      includeTransfersIntoPots: false,
    },
    {
      id: "savings-and-goals",
      name: labels.savingsAndGoals,
      colorToken: "#14B8A6",
      icon: "flag-outline",
      includeAllTransactions: false,
      accountIds: [],
      categoryIds: [],
      potAccountIds: [],
      includeTransfersBetweenAccounts: false,
      includeTransfersIntoPots: true,
    },
    {
      id: "expenses",
      name: labels.expenses,
      colorToken: "#EF4444",
      icon: "cart-outline",
      includeAllTransactions: true,
      accountIds: [],
      categoryIds: [],
      potAccountIds: [],
      includeTransfersBetweenAccounts: false,
      includeTransfersIntoPots: false,
    },
  ];
}

export function createWageFlowCategoryId() {
  return `wf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Builds one new draft `WageFlowCategoryConfig` per main (top-level)
 * transaction category that doesn't already have a Wage Flow category
 * filtering on it -- the "Add all main categories" bulk action. A main
 * category already covered by an existing Wage Flow category (i.e. its id
 * appears in some existing config's `categoryIds`) is skipped, so running
 * this again after adding or editing categories only fills in the gaps
 * rather than creating duplicates.
 *
 * This is a one-time snapshot, not a standing rule: main categories created
 * later are not picked up automatically. Re-run this action to add whatever
 * is still missing at that point.
 */
export function buildOneWageFlowCategoryPerMainCategory(params: {
  mainCategories: { id: string; name: string }[];
  existingConfigs: WageFlowCategoryConfig[];
}): WageFlowCategoryConfig[] {
  const { mainCategories, existingConfigs } = params;
  const alreadyCoveredIds = new Set(existingConfigs.flatMap((config) => config.categoryIds));
  const missingMainCategories = mainCategories.filter((main) => !alreadyCoveredIds.has(main.id));

  return missingMainCategories.map((main, index) => ({
    id: createWageFlowCategoryId(),
    name: main.name,
    colorToken: WAGE_FLOW_COLOR_PALETTE[index % WAGE_FLOW_COLOR_PALETTE.length],
    icon: "pricetag-outline",
    includeAllTransactions: false,
    accountIds: [],
    // Just the main category id -- expandCategoryIds already brings in its
    // subcategories automatically at match time, the same as any other
    // manually-selected main category.
    categoryIds: [main.id],
    potAccountIds: [],
    includeTransfersBetweenAccounts: false,
    includeTransfersIntoPots: false,
  }));
}
