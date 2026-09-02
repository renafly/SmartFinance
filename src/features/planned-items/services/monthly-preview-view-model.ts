import type { Database } from "@/types/database.types";

import { roundMoney } from "./planned-items-resolver";
import type { ResolvedMonth } from "../types";

type AccountType = Database["public"]["Enums"]["account_type"];

/**
 * Minimal account shape this view model needs -- deliberately a superset
 * of the resolver's own `PlannedItemAccountLike` (id + type), adding the
 * two fields the redesigned Monthly Preview needs that the resolver never
 * did: `ownerProfileId` (to group Account Impact by household member,
 * reusing the exact same `accounts.owner_profile_id` data the Transfers
 * list has always grouped by -- see budget.tsx's `accountOwnerProfileById`)
 * and `currentBalance` (the real, already-loaded account balance -- see
 * `useAccountsWithBalances` -- for Account Impact's "Before" column; this
 * view model never fetches or computes a balance itself).
 */
export type MonthlyPreviewAccount = {
  id: string;
  type: AccountType;
  ownerProfileId: string | null;
  currentBalance: number;
};

export type MonthlyPreviewSegmentKey = "expenses" | "savings" | "investments" | "remaining" | "overBudget";

export type MonthlyPreviewSegment = {
  key: MonthlyPreviewSegmentKey;
  amount: number;
  /** 0-100. Always of the same base as every other segment this month (see buildMonthlyPreviewViewModel's doc comment) so the full set of segments for a month always sums to ~100. */
  percent: number;
};

export type MonthlyPreviewCategoryGroup = {
  /** null = no category set on that planned item. */
  categoryId: string | null;
  amount: number;
};

export type MonthlyPreviewAccountGroup = {
  accountId: string;
  amount: number;
};

export type MonthlyPreviewAccountImpact = {
  accountId: string;
  ownerProfileId: string | null;
  accountType: AccountType;
  /** The account's real current balance -- never touched by this preview (see the module doc comment: preview-only, no balance is ever written here). */
  before: number;
  /** Net of every transaction leg this month's confirm would post to this account (incoming - outgoing). */
  change: number;
  /** before + change -- what the balance would be if this month is run as currently planned. */
  after: number;
};

export type MonthlyPreviewComparison = {
  income: number;
  expenses: number;
  savings: number;
  investments: number;
  remaining: number;
};

export type MonthlyPreviewViewModel = {
  totalIncome: number;
  allocated: number;
  /** Never negative -- see `isOverAllocated`/`overAllocatedBy` for the over-budget case. */
  remaining: number;
  isOverAllocated: boolean;
  /** allocated - totalIncome, only when isOverAllocated (0 otherwise). */
  overAllocatedBy: number;
  allocations: {
    expenses: number;
    savings: number;
    investments: number;
  };
  /** For the segmented allocation bar -- always in this order (expenses, savings, investments, then either 'remaining' or 'overBudget', never both). */
  segments: MonthlyPreviewSegment[];
  breakdown: {
    /** Sorted largest first. */
    expenses: MonthlyPreviewCategoryGroup[];
    savings: MonthlyPreviewAccountGroup[];
    investments: MonthlyPreviewAccountGroup[];
  };
  /** Only accounts touched by at least one transaction leg this month -- sorted by change, largest inflow first. */
  accountImpacts: MonthlyPreviewAccountImpact[];
  /** null when no previous-month comparison was supplied (see buildMonthlyPreviewViewModel's `previousMonth` param) -- the UI hides the "Compared with last month" block entirely in that case, never rendering a zeroed-out one. */
  comparedWithLastMonth: MonthlyPreviewComparison | null;
};

/**
 * Builds ONE normalized view model for the redesigned Monthly Preview
 * (see budget.tsx's own doc comment on that section for the design this
 * implements, and the user's own redesign brief for the full rationale).
 * Pure and stateless: no I/O, no ids invented, no i18n -- every number
 * here is either read straight off `resolved.summary` (already computed
 * once by the resolver's own `summarize()`, see planned-items-resolver.ts)
 * or re-derived from the exact same `transactionLegs`/`destinations` the
 * resolver already produced per occurrence. Nothing here re-implements
 * the resolver's own money math; it only regroups it for this screen.
 * Labels (account/category/member names) are deliberately NOT resolved
 * here -- callers already have `accountNameMap`/category maps/member
 * lists for that (see budget.tsx), and this stays testable without
 * needing i18n or member objects.
 *
 * The canonical relationship this enforces everywhere it computes a
 * number, per the redesign brief:
 *
 *   totalIncome = expenses + savings + investments + remaining
 *   allocated   = expenses + savings + investments
 *   remaining   = totalIncome - allocated
 *
 * Why `expenses` here is NOT `summary.plannedExpenses + summary.estimatedExpenses`:
 * those two resolver fields count every OUTFLOW occurrence's full amount,
 * including an occurrence that is itself a transfer INTO a savings/
 * investment account (a "move money to savings" planned item is
 * direction = 'outflow' too -- see resolvePlannedMonth). `summary.savings`
 * / `summary.investments` already carry that same money a second time,
 * bucketed by destination account type. So
 * `plannedExpenses + estimatedExpenses` on its own double-counts
 * savings/investments -- exactly the "Into savings / Savings /
 * Investments" overlap the redesign brief calls out. Subtracting
 * savings+investments back out gives the true "left the household as a
 * plain expense" number. `remaining` is unaffected either way, since
 * savings/investments were always a SUBSET of plannedExpenses +
 * estimatedExpenses, never additional to it -- so
 * `income - plannedExpenses - estimatedExpenses` (the resolver's own
 * `summary.available`) and `income - (expenses + savings + investments)`
 * (this function's `remaining`, before clamping) are the same number.
 */
export function buildMonthlyPreviewViewModel(input: {
  resolved: ResolvedMonth;
  accounts: MonthlyPreviewAccount[];
  /** A prior month's own {income, expenses, savings, investments, remaining} (same shape this function itself would have produced for that month) -- e.g. from `useRecentPlannedMonthsSummary`. Omit/null to hide "compared with last month" entirely. */
  previousMonth?: MonthlyPreviewComparison | null;
}): MonthlyPreviewViewModel {
  const { resolved, accounts, previousMonth = null } = input;
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const { summary } = resolved;

  const totalIncome = summary.income;
  const savings = summary.savings;
  const investments = summary.investments;
  const expenses = roundMoney(summary.plannedExpenses + summary.estimatedExpenses - savings - investments);
  const allocated = roundMoney(expenses + savings + investments);
  const remainingRaw = roundMoney(totalIncome - allocated);
  const remaining = Math.max(0, remainingRaw);
  const isOverAllocated = remainingRaw < -0.005;
  const overAllocatedBy = isOverAllocated ? roundMoney(Math.abs(remainingRaw)) : 0;

  // Every segment's percent is "of whichever is bigger, income or
  // allocated" -- so an over-allocated month still renders a bar that
  // reaches exactly 100% (with an explicit overBudget segment) instead of
  // silently overflowing past the end of the track. `0.01` floors the
  // base so a income=0/allocated=0 month doesn't divide by zero (every
  // segment is 0 anyway in that case, so the exact base doesn't matter).
  const percentBase = Math.max(totalIncome, allocated, 0.01);
  const percentOf = (amount: number) => roundMoney((Math.max(0, amount) / percentBase) * 100);

  const segments: MonthlyPreviewSegment[] = [
    { key: "expenses", amount: expenses, percent: percentOf(expenses) },
    { key: "savings", amount: savings, percent: percentOf(savings) },
    { key: "investments", amount: investments, percent: percentOf(investments) },
    isOverAllocated
      ? { key: "overBudget", amount: overAllocatedBy, percent: percentOf(overAllocatedBy) }
      : { key: "remaining", amount: remaining, percent: percentOf(remaining) },
  ];

  const expensesByCategory = new Map<string | null, number>();
  const savingsByAccount = new Map<string, number>();
  const investmentsByAccount = new Map<string, number>();
  // accountId -> net change (incoming - outgoing) across every leg this
  // month would post -- the same role -> direction mapping
  // confirm_planned_item_month uses to decide transactions.type.
  const netChangeByAccount = new Map<string, number>();

  for (const resolvedOccurrence of resolved.occurrences) {
    if (!resolvedOccurrence.isValid) continue;
    const { occurrence } = resolvedOccurrence;
    if (occurrence.status === "skipped" || occurrence.status === "cancelled") continue;
    const isInflow = occurrence.sourceAccountId === null;

    if (!isInflow) {
      let toSavingsOrInvestments = 0;
      for (const destination of resolvedOccurrence.destinations) {
        const account = accountsById.get(destination.destinationAccountId);
        if (account?.type === "savings") {
          savingsByAccount.set(
            destination.destinationAccountId,
            roundMoney((savingsByAccount.get(destination.destinationAccountId) ?? 0) + destination.amount),
          );
          toSavingsOrInvestments = roundMoney(toSavingsOrInvestments + destination.amount);
        } else if (account?.type === "investment") {
          investmentsByAccount.set(
            destination.destinationAccountId,
            roundMoney((investmentsByAccount.get(destination.destinationAccountId) ?? 0) + destination.amount),
          );
          toSavingsOrInvestments = roundMoney(toSavingsOrInvestments + destination.amount);
        }
      }
      const pureExpenseAmount = roundMoney(occurrence.expectedAmount - toSavingsOrInvestments);
      if (pureExpenseAmount > 0.001) {
        expensesByCategory.set(occurrence.categoryId, roundMoney((expensesByCategory.get(occurrence.categoryId) ?? 0) + pureExpenseAmount));
      }
    }

    for (const leg of resolvedOccurrence.transactionLegs) {
      const delta = leg.role === "income" || leg.role === "transfer_destination" ? leg.amount : -leg.amount;
      netChangeByAccount.set(leg.accountId, roundMoney((netChangeByAccount.get(leg.accountId) ?? 0) + delta));
    }
  }

  const accountImpacts: MonthlyPreviewAccountImpact[] = [...netChangeByAccount.entries()]
    .filter(([, change]) => Math.abs(change) > 0.001)
    .map(([accountId, change]) => {
      const account = accountsById.get(accountId);
      const before = account?.currentBalance ?? 0;
      return {
        accountId,
        ownerProfileId: account?.ownerProfileId ?? null,
        // Falls back to "bank" only if a leg somehow references an
        // account missing from `accounts` -- shouldn't happen (every
        // leg's accountId comes from the household's own accounts), but
        // keeps this function total rather than throwing on bad input.
        accountType: account?.type ?? "bank",
        before,
        change,
        after: roundMoney(before + change),
      };
    })
    .sort((a, b) => b.change - a.change);

  const toCategoryGroups = (map: Map<string | null, number>): MonthlyPreviewCategoryGroup[] =>
    [...map.entries()]
      .map(([categoryId, amount]) => ({ categoryId, amount }))
      .sort((a, b) => b.amount - a.amount);
  const toAccountGroups = (map: Map<string, number>): MonthlyPreviewAccountGroup[] =>
    [...map.entries()]
      .map(([accountId, amount]) => ({ accountId, amount }))
      .sort((a, b) => b.amount - a.amount);

  const comparedWithLastMonth: MonthlyPreviewComparison | null = previousMonth
    ? {
        income: roundMoney(totalIncome - previousMonth.income),
        expenses: roundMoney(expenses - previousMonth.expenses),
        savings: roundMoney(savings - previousMonth.savings),
        investments: roundMoney(investments - previousMonth.investments),
        remaining: roundMoney(remainingRaw - previousMonth.remaining),
      }
    : null;

  return {
    totalIncome,
    allocated,
    remaining,
    isOverAllocated,
    overAllocatedBy,
    allocations: { expenses, savings, investments },
    segments,
    breakdown: {
      expenses: toCategoryGroups(expensesByCategory),
      savings: toAccountGroups(savingsByAccount),
      investments: toAccountGroups(investmentsByAccount),
    },
    accountImpacts,
    comparedWithLastMonth,
  };
}
