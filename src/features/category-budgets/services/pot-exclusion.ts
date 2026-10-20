import type { Database } from "@/types/database.types";

type AccountType = Database["public"]["Enums"]["account_type"];

/**
 * Which money counts toward a Category Budget -- the one place this feature
 * decides it.
 *
 * Rule (per the product owner): only accounts of type `bank` are budget
 * accounts. Money moving through any other account type (savings,
 * investment, PPR, cash, credit card -- which is where pots such as Revolut
 * pots live) is ignored. A bank account counts even when it is linked to a
 * saving pot (`saving_pot_accounts`): the account type is what decides.
 *
 * On the transaction side, pot money is also excluded when a pot is the
 * funding source directly (`transactions.pot_id`) or one slice of a split
 * transaction (`transaction_allocations.source_type = 'pot'`).
 *
 * Pure and dependency-free so it can be unit-tested without the network.
 */

export type PotClassifiableAccount = {
  id: string;
  type: AccountType;
};

/** The only account type whose money counts toward a category budget. */
export const BUDGET_ACCOUNT_TYPE: AccountType = "bank";

export type PotAllocationLike = {
  sourceType: "account" | "pot";
  accountId: string | null;
  potId: string | null;
  amount: number;
};

function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

/**
 * True when the account's money counts toward category budgets: a known
 * account of type `bank`. Unknown ids (not loaded) and every other type are
 * ignored.
 */
export function isBudgetAccount(
  accountId: string | null | undefined,
  accountsById: ReadonlyMap<string, PotClassifiableAccount>,
): boolean {
  if (!accountId) return false;
  return accountsById.get(accountId)?.type === BUDGET_ACCOUNT_TYPE;
}

/**
 * The part of an expense that counts toward a category budget, as a fraction
 * (0..1) of the transaction's amount:
 *
 * - funded straight from a pot (`potId` set) -> 0;
 * - a split transaction -> the share of its allocations paid from bank
 *   accounts (pot slices and other account types are ignored);
 * - otherwise -> 1 when paid from a bank account, 0 when not.
 *
 * Returned as a share rather than an amount so the caller can apply it to
 * whatever amount it counts (e.g. the reimbursement-adjusted effective
 * amount), keeping split proportions intact.
 */
export function budgetShareOfExpense(
  transaction: {
    accountId: string;
    potId?: string | null;
    allocations?: readonly PotAllocationLike[] | null;
  },
  accountsById: ReadonlyMap<string, PotClassifiableAccount>,
): number {
  if (transaction.potId) return 0;

  const allocations = transaction.allocations ?? [];
  if (allocations.length > 0) {
    let total = 0;
    let counted = 0;
    for (const allocation of allocations) {
      const amount = Number(allocation.amount) || 0;
      total += amount;
      const fromBank = allocation.sourceType === "account" && !allocation.potId && isBudgetAccount(allocation.accountId, accountsById);
      if (fromBank) counted += amount;
    }
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, counted / total));
  }

  return isBudgetAccount(transaction.accountId, accountsById) ? 1 : 0;
}

/**
 * A planned outflow occurrence's expected amount that counts toward a
 * category budget: 0 unless it is paid from a bank account, minus every
 * destination leg that lands in a non-bank account (money moved into
 * savings/investments/pots is not spending).
 */
export function budgetPlannedExpenseAmount(
  occurrence: { sourceAccountId: string | null; expectedAmount: number },
  destinations: readonly { destinationAccountId: string; amount: number }[],
  accountsById: ReadonlyMap<string, PotClassifiableAccount>,
): number {
  if (!isBudgetAccount(occurrence.sourceAccountId, accountsById)) return 0;
  let excluded = 0;
  for (const destination of destinations) {
    if (!isBudgetAccount(destination.destinationAccountId, accountsById)) {
      excluded = roundMoney(excluded + destination.amount);
    }
  }
  return roundMoney(occurrence.expectedAmount - excluded);
}
