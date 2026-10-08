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
 * category that matches claims it (first-match-wins) -- but only *within*
 * two separate matching passes: one for criteria tied to a specific tracked
 * account (`accountIds`, `potAccountIds`, the two broad transfer toggles),
 * and one for criteria that aren't (`categoryIds`, `includeAllTransactions`).
 * A transaction can be claimed by (at most) one entry from each pass, so the
 * same transaction can legitimately affect two different flow sections at
 * once -- e.g. an expense paid directly from a tracked savings pot both
 * subtracts from that pot's net contribution AND adds to whichever
 * category-based (or catch-all) section it belongs to. Flow sections are
 * never globally deduplicated against each other; a transaction is only
 * ever excluded from a *specific* section if it doesn't satisfy that
 * section's own rules, never because some other section already claimed it.
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
  /** The transaction's own category (a subcategory or the main one) -- lets
   * the details panel filter a bucket's transactions by subcategory. */
  categoryId: string | null;
  /** For the outgoing leg of a transfer: the account the money went to
   * (the other leg's account). Null for anything else. */
  destinationAccountId: string | null;
};

/** One contributor to a bucket's total, used to split its flow segment into
 * shaded sub-segments (see `WageFlowCategoryResult.subcategories`). Either a
 * real transaction category (`id` is the category id) or the synthetic
 * "other" leftover for the portion of the bucket's amount that isn't tied to
 * a specific category (e.g. it came from a tracked-account/pot match, or
 * from transactions with no category assigned). */
export type WageFlowSubcategoryResult = {
  id: string;
  name: string;
  amount: number;
  /** Share of this bucket's own total amount, 0-100 (not of overall income). */
  share: number;
};

export type WageFlowCategoryResult = {
  id: string;
  name: string;
  colorToken: WageFlowColorToken;
  icon: string;
  amount: number;
  /** Share of total income, 0-100 (not clamped). */
  share: number;
  /** Breakdown of this bucket's amount by the real transaction category each
   * matched expense belongs to, largest first, summing exactly to `amount`.
   * Only populated when there are at least two contributing groups -- a
   * bucket driven by a single category (or with no category data at all,
   * e.g. a pure account/pot tracker) is left as an empty array so the chart
   * renders it as one solid segment instead of a meaningless one-slice
   * "breakdown". */
  subcategories: WageFlowSubcategoryResult[];
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

/** One reimbursement toward an expense (transaction_reimbursements row). */
export type WageFlowReimbursement = {
  transactionId: string;
  amount: number;
  /** The account the repayment landed in; null for a pot reimbursement. */
  accountId: string | null;
};

/**
 * Shows expenses net of what other people already paid back, the same way
 * the replenishment wizard only offers what's still owed:
 *  - the income row a reimbursement generates is dropped -- it's not
 *    household income, it's someone settling part of an expense;
 *  - each expense (or each leg of a split one -- ids `${transactionId}:...`,
 *    see expandTransactionAllocationLegs) is reduced by its reimbursements:
 *    first on the leg(s) paid from the account the repayment landed in
 *    (that's the account that got its money back), then whatever is left
 *    proportionally across the remaining legs;
 *  - a leg (or expense) that ends up fully reimbursed disappears, so an
 *    expense that was entirely paid back shows neither the expense nor the
 *    repayment, and a partial one shows only what's still missing.
 * Transfers are never touched.
 */
export function netReimbursedWageFlowTransactions<T extends InsightTransaction>(
  transactions: readonly T[],
  reimbursements: readonly WageFlowReimbursement[],
): T[] {
  const byTransactionId = new Map<string, WageFlowReimbursement[]>();
  for (const reimbursement of reimbursements) {
    if (!(reimbursement.amount > 0)) continue;
    const list = byTransactionId.get(reimbursement.transactionId) ?? [];
    list.push(reimbursement);
    byTransactionId.set(reimbursement.transactionId, list);
  }

  const baseId = (id: string) => id.split(":")[0];
  const isNettableExpense = (item: InsightTransaction) =>
    item.type === "expense" && !item.transfer_group_id && byTransactionId.has(baseId(item.id));

  // Remaining cents per leg, keyed by the leg's own id.
  const remainingCents = new Map<string, number>();
  const legsByTransactionId = new Map<string, T[]>();
  for (const item of transactions) {
    if (!isNettableExpense(item)) continue;
    const key = baseId(item.id);
    const legs = legsByTransactionId.get(key) ?? [];
    legs.push(item);
    legsByTransactionId.set(key, legs);
    remainingCents.set(item.id, Math.round(item.amount * 100));
  }

  for (const [transactionId, legs] of legsByTransactionId) {
    const list = byTransactionId.get(transactionId) ?? [];
    let unassignedCents = 0;

    // 1) Against the leg(s) paid from the account the repayment landed in.
    for (const reimbursement of list) {
      let cents = Math.round(reimbursement.amount * 100);
      if (reimbursement.accountId) {
        for (const leg of legs) {
          if (cents <= 0) break;
          if (leg.account_id !== reimbursement.accountId) continue;
          const take = Math.min(cents, remainingCents.get(leg.id) ?? 0);
          remainingCents.set(leg.id, (remainingCents.get(leg.id) ?? 0) - take);
          cents -= take;
        }
      }
      unassignedCents += cents;
    }

    // 2) Whatever's left, proportionally across the remaining legs (cent
    //    remainder on the last one), never below zero.
    const open = legs.filter((leg) => (remainingCents.get(leg.id) ?? 0) > 0);
    const openTotal = open.reduce((sum, leg) => sum + (remainingCents.get(leg.id) ?? 0), 0);
    if (unassignedCents > 0 && openTotal > 0) {
      const toAssign = Math.min(unassignedCents, openTotal);
      let assigned = 0;
      open.forEach((leg, index) => {
        const current = remainingCents.get(leg.id) ?? 0;
        const take =
          index === open.length - 1
            ? Math.min(current, toAssign - assigned)
            : Math.min(current, Math.floor((toAssign * current) / openTotal));
        assigned += take;
        remainingCents.set(leg.id, current - take);
      });
    }
  }

  const result: T[] = [];
  for (const item of transactions) {
    if (item.reimbursement_id && !item.transfer_group_id) continue;
    if (!remainingCents.has(item.id)) {
      result.push(item);
      continue;
    }
    const cents = remainingCents.get(item.id) ?? 0;
    if (cents <= 0) continue;
    result.push({ ...item, amount: cents / 100 });
  }
  return result;
}

export type WageFlowAccount = {
  id: string;
  /** bank | cash | savings | credit_card | investment | ppr */
  type: string;
};

export type WageFlowCategory = {
  id: string;
  name: string;
  parent_id?: string | null;
  is_discretionary?: boolean | null;
  type?: string | null;
  is_archived?: boolean | null;
  sort_order?: number | null;
  color?: string | null;
  icon?: string | null;
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
  destinationAccountId: string | null = null,
): WageFlowMatchedTransaction {
  return {
    id: item.id,
    title: item.title,
    amount: signedAmount,
    transactionDate: item.transaction_date,
    accountId: item.account_id,
    isTransfer,
    categoryId: item.category_id ?? null,
    destinationAccountId,
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
 *  - A transfer's outgoing leg with an explicit `category_id` (e.g. a
 *    Monthly Budget allocation tagged "Investments") is *also* eligible for
 *    the categoryIds/catch-all pass below, on top of the tracked-account
 *    pass above — the same "one match per pass" rule as any other
 *    transaction. This is what lets a categorized budget-generated transfer
 *    show up in a category-filtered bucket. Uncategorized transfers are
 *    completely unaffected: this pass only ever runs when `category_id` is
 *    set, and never via `includeAllTransactions`.
 *  - Categories are matched in array order; the first category whose rules
 *    match a transaction/leg claims it -- but tracked-account matching
 *    (`accountIds`/`potAccountIds`/the broad transfer toggles) and
 *    category/catch-all matching (`categoryIds`/`includeAllTransactions`)
 *    are resolved as two separate passes over the category list, not one.
 *    A non-transfer expense can therefore be claimed by one entry from each
 *    pass at the same time: e.g. a bill paid directly out of a tracked
 *    savings pot both subtracts from that pot's net contribution (tracked-
 *    account pass) AND adds to whichever expense category it's assigned to
 *    (category pass). Flow sections are never globally deduplicated against
 *    one another -- a transaction is excluded from a given section only when
 *    it fails that section's own rules, never because some other section
 *    already counted it.
 */
export function calculateWageFlow(params: {
  transactions: InsightTransaction[];
  accounts: WageFlowAccount[];
  categories: WageFlowCategory[];
  config: WageFlowCategoryConfig[];
  range?: WageFlowRange;
  /** Label for the synthetic leftover group covering the portion of a
   * bucket's amount that isn't tied to a specific transaction category
   * (e.g. account/pot tracking, or uncategorized transactions). Defaults to
   * "Other" for callers that don't localize it. */
  otherCategoryLabel?: string;
  /** Reimbursements toward the period's expenses. When given, expenses are
   * shown net of them and reimbursement income is left out (see
   * netReimbursedWageFlowTransactions); omit to use the raw amounts. */
  reimbursements?: readonly WageFlowReimbursement[];
}): WageFlowReport {
  const { accounts, categories, config, range = {}, otherCategoryLabel = "Other" } = params;
  const transactions = params.reimbursements
    ? netReimbursedWageFlowTransactions(params.transactions, params.reimbursements)
    : params.transactions;
  const accountTypeById = new Map(accounts.map((account) => [account.id, account.type]));
  // Where each transfer's money went: the incoming leg's account, so an
  // outgoing leg can show its destination in the details panel.
  const transferDestinationByGroup = new Map<string, string>();
  for (const item of transactions) {
    if (item.transfer_group_id && item.type === "income") {
      transferDestinationByGroup.set(item.transfer_group_id, item.account_id);
    }
  }
  const matchOf = (item: InsightTransaction, isTransfer: boolean, signedAmount: number) =>
    toMatch(
      item,
      isTransfer,
      signedAmount,
      item.transfer_group_id && item.type === "expense"
        ? (transferDestinationByGroup.get(item.transfer_group_id) ?? null)
        : null,
    );
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
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
    /** Amount attributed to each real transaction category, accumulated
     * only from the category/catch-all matching pass below -- money that
     * enters a bucket via the tracked-account/pot pass, or via a category-
     * pass match with no `category_id`, isn't attributed to any specific
     * category and shows up as leftover "other" instead (see below). */
    subcategoryAmounts: new Map<string, number>(),
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
          entry.matches.push(matchOf(item, false, item.amount));
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
          entry.matches.push(matchOf(item, true, sign * item.amount));
          break;
        }
      }

      // A transfer's outgoing leg can also carry an explicit category — the
      // main case being a Monthly Budget allocation tagged e.g.
      // "Investments" or "Savings > PPR", which generates a normal transfer
      // under the hood but should still show up in whichever Wage Flow
      // bucket is filtered to that category. This mirrors the category
      // pass a plain expense goes through below: an entry that itself
      // tracks this account is skipped (it already had its chance to claim
      // the leg above), every other entry is still checked. Only
      // categoryIds matching applies here — never includeAllTransactions —
      // so an uncategorized transfer is never swept into a catch-all
      // bucket; every transfer already in the system today has no category
      // on either leg, so this is purely additive and changes nothing for
      // them.
      if (item.type === "expense" && item.category_id) {
        for (const entry of entries) {
          if (matchesTrackedAccount(entry, item.account_id)) continue;
          if (entry.expandedCategoryIds.has(item.category_id)) {
            entry.amount += item.amount;
            entry.matches.push(matchOf(item, false, item.amount));
            entry.subcategoryAmounts.set(
              item.category_id,
              (entry.subcategoryAmounts.get(item.category_id) ?? 0) + item.amount,
            );
            break;
          }
        }
      }

      continue;
    }

    if (item.type !== "expense") continue;

    // Tracked-account pass: an expense paid from a tracked account/pot (or
    // caught by a broad account-type toggle) is an outflow, so it subtracts
    // from that account's net contribution, the same as an outgoing
    // transfer would. At most one entry can own a given account, so this
    // stays first-match-wins.
    for (const entry of entries) {
      if (matchesTrackedAccount(entry, item.account_id)) {
        entry.amount -= item.amount;
        entry.matches.push(matchOf(item, false, -item.amount));
        break;
      }
    }

    // Category / catch-all pass: resolved independently of the pass above,
    // so a transaction that already subtracted from a tracked-account flow
    // (e.g. a bill paid directly out of a savings pot) still adds to
    // whichever category-based or catch-all flow it belongs to -- flow
    // sections are never globally deduplicated against each other. An entry
    // that already claimed this transaction via the tracked-account pass is
    // skipped here so that *same* entry can't also count it a second time
    // against itself.
    for (const entry of entries) {
      const { cfg } = entry;
      if (matchesTrackedAccount(entry, item.account_id)) continue;

      const matchesCategory = item.category_id
        ? entry.expandedCategoryIds.has(item.category_id)
        : false;

      if (cfg.includeAllTransactions || matchesCategory) {
        // Not tied to a specific account -- a plain spend total, unsigned.
        entry.amount += item.amount;
        entry.matches.push(matchOf(item, false, item.amount));
        if (item.category_id) {
          entry.subcategoryAmounts.set(
            item.category_id,
            (entry.subcategoryAmounts.get(item.category_id) ?? 0) + item.amount,
          );
        }
        break;
      }
    }
  }

  const totalAllocated = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const share = (amount: number) => (income > 0 ? roundMoney((amount / income) * 100) : 0);

  /** Builds the subcategory breakdown for one bucket: the real categories
   * that contributed to it (largest first), plus a leftover "other" group
   * for whatever portion of the bucket's amount isn't tied to a specific
   * category, so the groups always sum exactly to the bucket's total. Left
   * empty (no breakdown) when the bucket's amount is zero/negative or when
   * there's only a single contributing group -- a one-slice "breakdown"
   * isn't meaningful and should render as a normal solid segment. */
  function buildSubcategories(entry: (typeof entries)[number]): WageFlowSubcategoryResult[] {
    const totalAmount = roundMoney(entry.amount);
    if (totalAmount <= 0) return [];

    const specific = [...entry.subcategoryAmounts.entries()]
      .map(([categoryId, amount]) => ({
        id: categoryId,
        name: categoryNameById.get(categoryId) ?? categoryId,
        amount: roundMoney(amount),
      }))
      .filter((group) => group.amount > 0);

    const specificTotal = specific.reduce((sum, group) => sum + group.amount, 0);
    const otherAmount = roundMoney(Math.max(0, totalAmount - specificTotal));
    const groups =
      otherAmount > 0
        ? [...specific, { id: `${entry.cfg.id}__other`, name: otherCategoryLabel, amount: otherAmount }]
        : specific;

    if (groups.length < 2) return [];

    // Sort by each subcategory's share of the bucket descending -- the
    // largest contributor first -- breaking ties by the underlying amount
    // descending. Share is computed before sorting so this is an explicit,
    // literal application of that rule rather than relying on amount order
    // happening to agree with rounded-share order.
    return groups
      .map((group) => ({
        ...group,
        share: totalAmount > 0 ? roundMoney((group.amount / totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.share - a.share || b.amount - a.amount);
  }

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
      subcategories: buildSubcategories(entry),
      matches: [...entry.matches].sort((a, b) =>
        b.transactionDate.localeCompare(a.transactionDate),
      ),
    })),
  };
}

/**
 * Wage Flow has no category system of its own: its buckets are exactly the
 * household's main (top-level) expense categories from the Categories
 * section, in their Categories order, each one also catching its
 * subcategories (shown as the slices inside the bucket -- see
 * buildSubcategories). A category that exists there shows up here; one
 * that doesn't, doesn't. Archived categories are left out.
 *
 * A bucket receives every non-transfer expense in its category tree plus
 * the outgoing leg of every transfer carrying one of those categories --
 * which is how savings/investment movements show up: Monthly Budget
 * transfers get their category from the destination account/pot (see
 * destination_category_for_account in
 * 20261007000200_categories_single_source.sql). Uncategorized spending
 * isn't assigned to any bucket and stays in the "unallocated" remainder.
 */
export function buildWageFlowConfigFromCategories(categories: readonly WageFlowCategory[]): WageFlowCategoryConfig[] {
  return categories
    .filter((category) => !category.parent_id && !category.is_archived && (category.type ?? "expense") === "expense")
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
    .map((category, index) => ({
      id: category.id,
      name: category.name,
      colorToken: category.color || WAGE_FLOW_COLOR_PALETTE[index % WAGE_FLOW_COLOR_PALETTE.length],
      icon: category.icon || "pricetag-outline",
      includeAllTransactions: false,
      accountIds: [],
      categoryIds: [category.id],
      potAccountIds: [],
      includeTransfersBetweenAccounts: false,
      includeTransfersIntoPots: false,
    }));
}
