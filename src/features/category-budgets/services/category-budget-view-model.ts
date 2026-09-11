import type { Database } from "@/types/database.types";

import { splitOutflowOccurrenceExpenseFromPots } from "@/features/planned-items/services/planned-items-resolver";
import { groupCategoriesByParent } from "@/features/categories/group-categories";
import type { ResolvedMonth, ResolvedOccurrence } from "@/features/planned-items/types";

import type { CategoryBudget } from "../types";

type AccountType = Database["public"]["Enums"]["account_type"];
type TransactionType = Database["public"]["Enums"]["transaction_type"];

function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export type CategoryBudgetStatus = "ok" | "approaching" | "over";

export type CategoryBudgetCategoryLike = {
  id: string;
  name: string;
  parentId: string | null;
};

/** Minimal transaction shape this module needs -- both legs of every transfer must be included (not pre-filtered to type='expense'), see the module doc comment on why. */
export type CategoryBudgetTransactionLike = {
  id: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  /** Display-only -- not used by any calculation, only carried through to CategoryBudgetTransactionLine for the expandable transaction list. */
  title: string;
  transactionDate: string;
  accountName: string;
  categoryId: string | null;
  transferGroupId: string | null;
  /** The planned_item_occurrence this transaction currently satisfies, if any -- either because it WAS this occurrence's expected_amount transaction (confirm_planned_item_occurrence/confirm_planned_item_month set transactions.planned_item_occurrence_id directly) or because it was separately matched to it (match_planned_item_occurrence / planned_item_matches). The caller resolves both sources into this one field before calling buildCategoryBudgetViewModel -- this module has no query access of its own. Null for an ordinary, unlinked transaction. */
  linkedOccurrenceId: string | null;
  /** True when `linkedOccurrenceId` came from transactions.planned_item_occurrence_id (this app generated the transaction directly) rather than from a planned_item_matches row (an existing transaction the user linked). Meaningless when linkedOccurrenceId is null. Determines which "unmark as paid" option set the UI offers -- only an auto-created transaction can be deleted, a matched one is never touched beyond unlinking. */
  isAutoCreatedTransaction: boolean;
};

export type CategoryBudgetAccountLike = {
  id: string;
  type: AccountType;
};

export type CategoryBudgetTransactionLine = {
  id: string;
  amount: number;
  title: string;
  transactionDate: string;
  accountName: string;
  /** See CategoryBudgetTransactionLike.linkedOccurrenceId. */
  linkedOccurrenceId: string | null;
  /** See CategoryBudgetTransactionLike.isAutoCreatedTransaction. */
  isAutoCreatedTransaction: boolean;
};

export type CategoryBudgetPlannedLine = {
  plannedItemId: string;
  occurrenceId: string;
  /** The occurrence's own exact category (planned_items.category_id) -- "link an existing transaction" tries this exact category first, only widening to the card's main/root category (CategoryBudgetEntry.mainCategoryId) if nothing turns up there. */
  categoryId: string;
  name: string;
  /** Pot-excluded (see splitOutflowOccurrenceExpenseFromPots) expected amount for this occurrence. */
  amount: number;
  isPaid: boolean;
  isEstimate: boolean;
  /** True for a single-leg, plain-expense occurrence (source account set, zero occurrence destinations) -- the only shape confirm_planned_item_occurrence accepts, see that migration's doc comment. Only meaningful when !isPaid; the UI uses this to decide whether to offer a "mark as paid" action on an unpaid line versus pointing the user at Run Monthly Budget for a split/transfer item. */
  canMarkPaid: boolean;
  /** The occurrence's own source account -- always set for an outflow line (see computePlannedLinesByCategory's isOutflow filter). Threaded through so the UI can offer "link to an existing transaction" (match_planned_item_occurrence, via PlannedItemOccurrenceMatchPicker) without a second query -- linking has no single-leg restriction the way canMarkPaid/confirm does, so it's offered regardless of that flag. */
  sourceAccountId: string | null;
  /** Real amount of the transaction currently satisfying this occurrence -- from that transaction's own `amount`, NEVER from `expected_amount` (which this line's own `amount` field already is, and which confirm/match never overwrite). Null while !isPaid. Can differ from `amount` (a different actual-vs-planned amount) -- the UI shows both side by side once paid. */
  actualAmount: number | null;
  /** The transaction currently satisfying this occurrence, for "tap for details" and as the target of a per-transaction unlink action. Null while !isPaid. */
  matchedTransactionId: string | null;
  /** True when this occurrence was paid via confirm_planned_item_occurrence/confirm_planned_item_month (this app generated `matchedTransactionId` directly) rather than match_planned_item_occurrence (an existing transaction the user linked). Meaningless while !isPaid. Selects which "unmark as paid" options the UI offers -- only an auto-created transaction can also be deleted. */
  isAutoCreated: boolean;
};

/** One category's own (non-rolled-up) contribution -- used both as the top-level entry's own numbers and as each child's row in `childBreakdown`. */
export type CategoryBudgetOwnTotals = {
  categoryId: string;
  categoryName: string;
  actualSpent: number;
  transactions: CategoryBudgetTransactionLine[];
  plannedUnpaid: CategoryBudgetPlannedLine[];
  plannedPaid: CategoryBudgetPlannedLine[];
  unpaidTotal: number;
};

export type CategoryBudgetEntry = {
  categoryId: string;
  categoryName: string;
  parentId: string | null;
  /** This category's own root-of-hierarchy ancestor (itself, if it already is one) -- the scope "link an existing transaction" filters candidates to, via resolveCategoryFilterIds' parent+children expansion, so a transaction logged under any sibling subcategory in this same family still turns up instead of only the exact occurrence's own category. */
  mainCategoryId: string;
  /** This category's own (non-rolled-up) contribution -- its own direct transactions/planned items only, never including any child's. */
  own: CategoryBudgetOwnTotals;
  /** Direct children's own totals, unrolled -- empty for a category with no children. A child that itself has no budget still gets a row here (its spend counts toward this parent's rollup either way); a child WITH its own budget also gets its own top-level CategoryBudgetEntry, independent of this one. */
  childBreakdown: CategoryBudgetOwnTotals[];
  budgetAmount: number;
  budgetEffectiveMonth: string;
  /** Summed across self (`own`) + every child in `childBreakdown`. */
  actualSpent: number;
  unpaidTotal: number;
  /** actualSpent + unpaidTotal. */
  expectedTotal: number;
  /** budgetAmount - expectedTotal. Can be negative once over budget. */
  remaining: number;
  /** expectedTotal / budgetAmount * 100. Not clamped to 100 -- callers decide how to render an over-budget bar. */
  percentUsed: number;
  status: CategoryBudgetStatus;
};

export type CategoryBudgetViewModel = {
  month: string;
  /** One per budgeted category (parent or child), sorted by percentUsed descending -- categories closest to (or over) their limit surface first. Only categories with an active budget get an entry; an unbudgeted category's spend still rolls up into a budgeted ancestor's entry, it just never gets a card of its own. */
  entries: CategoryBudgetEntry[];
};

/**
 * Reduces the full effective-dated history (every category_budgets row
 * with effective_month <= the month being viewed, see
 * CategoryBudgetsRepository.listEffectiveForMonth) down to "the one
 * active limit per category" -- the row with the latest effectiveMonth
 * for each categoryId. Pure and separate from the network call so it's
 * directly testable (see the historical-correctness test cases).
 */
export function resolveActiveCategoryBudgets(budgets: CategoryBudget[]): Map<string, CategoryBudget> {
  const activeByCategory = new Map<string, CategoryBudget>();
  for (const budget of budgets) {
    const current = activeByCategory.get(budget.categoryId);
    if (!current || budget.effectiveMonth > current.effectiveMonth) {
      activeByCategory.set(budget.categoryId, budget);
    }
  }
  return activeByCategory;
}

/**
 * Real, posted spend for the month, grouped by category_id -- the
 * "actual amount spent so far" side of the budget. Deliberately reads
 * plain `transactions` rather than any pre-aggregated view: the existing
 * `monthly_category_spending` DB view (013_views.sql) predates both the
 * transfer-can-carry-an-expense-category change and the planned_items
 * rebuild, and does a naive `where type = 'expense'` with no transfer
 * handling at all -- reusing it here would resurrect exactly the bug this
 * function exists to avoid. Unused by anything else in the app today, so
 * left alone rather than fixed as part of this feature.
 *
 * `transactions.type` has only two values -- 'income' and 'expense'. A
 * transfer is two linked rows sharing `transferGroupId` (one 'expense'
 * leg on the source account, one 'income' leg on the destination
 * account); a transfer's expense leg CAN carry a normal expense category
 * (e.g. a Monthly-Budget-generated allocation tagged "Investments") since
 * 20260813190000_transfer_category_allows_expense_type.sql, so
 * `type = 'expense' && !transferGroupId` is not a safe enough filter on
 * its own. The rule applied here, matching
 * splitOutflowOccurrenceExpenseFromPots' treatment of planned items:
 * a transfer's expense leg is excluded from category spend entirely when
 * its OTHER leg (the money's actual destination) lands on a
 * savings/investment-type account -- that's money moving within the
 * household, not spending, category tag or not. A transfer whose
 * destination is an ordinary bank/cash/credit-card account is not
 * excluded by this rule; if it happens to carry a category, it counts
 * like any other categorized expense (this codebase has no broader
 * "exclude every transfer" requirement, only the savings/investment
 * case).
 */
function computeActualSpendByCategory(
  transactions: CategoryBudgetTransactionLike[],
  accountsById: Map<string, CategoryBudgetAccountLike>,
): { byCategory: Map<string, { amount: number; transactions: CategoryBudgetTransactionLine[] }> } {
  const legsByTransferGroup = new Map<string, CategoryBudgetTransactionLike[]>();
  for (const transaction of transactions) {
    if (!transaction.transferGroupId) continue;
    const list = legsByTransferGroup.get(transaction.transferGroupId) ?? [];
    list.push(transaction);
    legsByTransferGroup.set(transaction.transferGroupId, list);
  }

  function transferDestinationIsPot(transferGroupId: string, ownAccountId: string): boolean {
    const legs = legsByTransferGroup.get(transferGroupId) ?? [];
    const destinationLeg = legs.find((leg) => leg.type === "income" && leg.accountId !== ownAccountId);
    if (!destinationLeg) return false;
    const account = accountsById.get(destinationLeg.accountId);
    return account?.type === "savings" || account?.type === "investment";
  }

  const byCategory = new Map<string, { amount: number; transactions: CategoryBudgetTransactionLine[] }>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    if (!transaction.categoryId) continue;
    if (transaction.transferGroupId && transferDestinationIsPot(transaction.transferGroupId, transaction.accountId)) {
      continue;
    }

    const entry = byCategory.get(transaction.categoryId) ?? { amount: 0, transactions: [] };
    entry.amount = roundMoney(entry.amount + transaction.amount);
    entry.transactions.push({
      id: transaction.id,
      amount: transaction.amount,
      title: transaction.title,
      transactionDate: transaction.transactionDate,
      accountName: transaction.accountName,
      linkedOccurrenceId: transaction.linkedOccurrenceId,
      isAutoCreatedTransaction: transaction.isAutoCreatedTransaction,
    });
    byCategory.set(transaction.categoryId, entry);
  }

  return { byCategory };
}

/**
 * Still-unpaid and already-paid planned/recurring expenses for the
 * month, grouped by category_id -- reads the SAME `ResolvedMonth` the
 * redesigned Monthly Preview already fetches via usePlannedItemsPreview
 * (see monthly-preview-view-model.ts), rather than querying
 * planned_item_occurrences a second time.
 *
 * Category attribution uses each occurrence's own top-level `categoryId`
 * (planned_items.category_id, mandatory), the same convention
 * monthly-preview-view-model.ts's `breakdown.expenses` uses -- a
 * multi-destination planned item's per-destination category override (if
 * any) is not separately tracked here, matching that existing precedent.
 *
 * Double-counting: only occurrences with status 'planned' contribute to
 * `unpaidTotal` / `plannedUnpaid`. A 'confirmed' occurrence already
 * generated a real transaction (confirm_planned_item_month) and a
 * 'matched' one is already linked to one (planned_item_matches) -- both
 * are already inside `computeActualSpendByCategory`'s real-transaction
 * totals, so counting them here too would double-count. They still get a
 * `plannedPaid` line (isPaid: true) purely for the UI's "which planned
 * expenses are paid" drill-down. 'skipped'/'cancelled' occurrences are
 * excluded entirely, same as the resolver's own `summarize()`.
 */
function computePlannedLinesByCategory(
  resolved: ResolvedMonth,
  accountsById: Map<string, CategoryBudgetAccountLike>,
  plannedItemNameById: Map<string, string>,
  /** Every transaction that currently satisfies SOME occurrence, keyed by that occurrence's id (see CategoryBudgetTransactionLike.linkedOccurrenceId) -- the source for each paid line's actualAmount/matchedTransactionId/isAutoCreated. A occurrence with no entry here (e.g. status flipped to 'confirmed'/'matched' but the linking transaction hasn't loaded/synced yet) falls back to its own expected_amount, same as before this lookup existed. */
  transactionByLinkedOccurrenceId: Map<string, CategoryBudgetTransactionLike>,
): Map<string, { unpaid: CategoryBudgetPlannedLine[]; paid: CategoryBudgetPlannedLine[] }> {
  const byCategory = new Map<string, { unpaid: CategoryBudgetPlannedLine[]; paid: CategoryBudgetPlannedLine[] }>();

  for (const resolvedOccurrence of resolved.occurrences) {
    if (!resolvedOccurrence.isValid) continue;
    const { occurrence } = resolvedOccurrence;
    const isOutflow = occurrence.sourceAccountId !== null;
    if (!isOutflow) continue;
    if (occurrence.status === "skipped" || occurrence.status === "cancelled") continue;

    const { pureExpenseAmount } = splitOutflowOccurrenceExpenseFromPots(resolvedOccurrence, accountsById);
    if (pureExpenseAmount <= 0.001) continue;

    const isPaid = occurrence.status !== "planned";
    const linkedTransaction = isPaid ? transactionByLinkedOccurrenceId.get(occurrence.id) ?? null : null;

    const line: CategoryBudgetPlannedLine = {
      plannedItemId: occurrence.plannedItemId,
      occurrenceId: occurrence.id,
      categoryId: occurrence.categoryId,
      name: plannedItemNameById.get(occurrence.plannedItemId) ?? "",
      amount: pureExpenseAmount,
      isPaid,
      isEstimate: occurrence.isEstimate,
      canMarkPaid: resolvedOccurrence.destinations.length === 0,
      sourceAccountId: occurrence.sourceAccountId,
      actualAmount: linkedTransaction?.amount ?? null,
      matchedTransactionId: linkedTransaction?.id ?? null,
      isAutoCreated: linkedTransaction?.isAutoCreatedTransaction ?? false,
    };

    const bucket = byCategory.get(occurrence.categoryId) ?? { unpaid: [], paid: [] };
    if (line.isPaid) {
      bucket.paid.push(line);
    } else {
      bucket.unpaid.push(line);
    }
    byCategory.set(occurrence.categoryId, bucket);
  }

  return byCategory;
}

function statusFor(percentUsed: number, approachingThresholdPercent: number): CategoryBudgetStatus {
  if (percentUsed > 100) return "over";
  if (percentUsed >= approachingThresholdPercent) return "approaching";
  return "ok";
}

/**
 * The ONE place category-budget math lives -- see this module's other
 * exported helpers for the two data sources this combines (real
 * transactions for "actual spend", the planned-items resolver's already-
 * computed `ResolvedMonth` for "still unpaid recurring expenses"). Pure
 * and stateless: no I/O, no ids invented, no i18n. Mirrors
 * monthly-preview-view-model.ts's own "one normalized view model" shape
 * for the same reasons -- one tested, reusable place for these numbers
 * instead of scattering the calculation across components.
 */
export function buildCategoryBudgetViewModel(input: {
  month: string;
  categories: CategoryBudgetCategoryLike[];
  budgets: CategoryBudget[];
  transactions: CategoryBudgetTransactionLike[];
  accounts: CategoryBudgetAccountLike[];
  resolved: ResolvedMonth;
  plannedItemNameById: Map<string, string>;
  /** percentUsed at/above which a category is "approaching" its limit (and below which, "over"). Defaults to 90. */
  approachingThresholdPercent?: number;
}): CategoryBudgetViewModel {
  const { month, categories, budgets, transactions, accounts, resolved, plannedItemNameById, approachingThresholdPercent = 90 } = input;

  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const activeBudgetByCategory = resolveActiveCategoryBudgets(budgets);
  const { byCategory: actualSpendByCategory } = computeActualSpendByCategory(transactions, accountsById);
  // Built once here (not inside computePlannedLinesByCategory) since it's
  // derived straight from this function's own `transactions` input --
  // every transaction that currently satisfies an occurrence, keyed by
  // that occurrence's id. See CategoryBudgetTransactionLike.linkedOccurrenceId.
  const transactionByLinkedOccurrenceId = new Map<string, CategoryBudgetTransactionLike>();
  for (const transaction of transactions) {
    if (transaction.linkedOccurrenceId) {
      transactionByLinkedOccurrenceId.set(transaction.linkedOccurrenceId, transaction);
    }
  }
  const plannedLinesByCategory = computePlannedLinesByCategory(resolved, accountsById, plannedItemNameById, transactionByLinkedOccurrenceId);

  // Reuses the same "bucket every category under its top-most reachable
  // ancestor" grouping the transaction/transfer CategoryPicker and the
  // category browser already use (see group-categories.ts) -- the app
  // only ever renders two visual category levels, so this gives the
  // exact "parent's budget includes every subcategory's spend" rollup
  // requested, without a second hierarchy/aggregation implementation.
  const { childrenByParent, rootIdByCategoryId } = groupCategoriesByParent(categories, (category) => category.parentId);

  function ownTotalsFor(categoryId: string): CategoryBudgetOwnTotals {
    const category = categoriesById.get(categoryId);
    const spend = actualSpendByCategory.get(categoryId);
    const planned = plannedLinesByCategory.get(categoryId);
    const unpaid = planned?.unpaid ?? [];
    return {
      categoryId,
      categoryName: category?.name ?? "",
      actualSpent: spend?.amount ?? 0,
      transactions: spend?.transactions ?? [],
      plannedUnpaid: unpaid,
      plannedPaid: planned?.paid ?? [],
      unpaidTotal: roundMoney(unpaid.reduce((sum, line) => sum + line.amount, 0)),
    };
  }

  const entries: CategoryBudgetEntry[] = [];

  for (const [categoryId, budget] of activeBudgetByCategory) {
    const category = categoriesById.get(categoryId);
    if (!category) continue; // Budget on an archived/deleted category -- nothing to show it against.

    const own = ownTotalsFor(categoryId);
    const isRoot = rootIdByCategoryId.get(categoryId) === categoryId;
    const childCategories = isRoot ? (childrenByParent.get(categoryId) ?? []) : [];
    const childBreakdown = childCategories.map((child) => ownTotalsFor(child.id));

    const actualSpent = roundMoney(own.actualSpent + childBreakdown.reduce((sum, child) => sum + child.actualSpent, 0));
    const unpaidTotal = roundMoney(own.unpaidTotal + childBreakdown.reduce((sum, child) => sum + child.unpaidTotal, 0));
    const expectedTotal = roundMoney(actualSpent + unpaidTotal);
    const remaining = roundMoney(budget.amount - expectedTotal);
    const percentUsed = budget.amount > 0 ? roundMoney((expectedTotal / budget.amount) * 100) : 0;

    entries.push({
      categoryId,
      categoryName: own.categoryName,
      parentId: category.parentId,
      mainCategoryId: rootIdByCategoryId.get(categoryId) ?? categoryId,
      own,
      childBreakdown,
      budgetAmount: budget.amount,
      budgetEffectiveMonth: budget.effectiveMonth,
      actualSpent,
      unpaidTotal,
      expectedTotal,
      remaining,
      percentUsed,
      status: statusFor(percentUsed, approachingThresholdPercent),
    });
  }

  entries.sort((a, b) => b.percentUsed - a.percentUsed);

  return { month, entries };
}
