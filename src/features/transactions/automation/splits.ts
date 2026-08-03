import type { TransactionSplitInput } from "./types";

const MONEY_EPSILON = 0.005;

export function validateTransactionSplits(
  transactionAmount: number,
  splits: readonly TransactionSplitInput[],
): void {
  if (!Number.isFinite(transactionAmount) || transactionAmount <= 0) {
    throw new Error("Transaction amount must be greater than zero.");
  }
  if (splits.length < 2) {
    throw new Error("A split transaction requires at least two allocations.");
  }
  if (
    splits.some((split) => !Number.isFinite(split.amount) || split.amount <= 0)
  ) {
    throw new Error("Every split amount must be greater than zero.");
  }

  const allocated = splits.reduce((total, split) => total + split.amount, 0);
  if (Math.abs(allocated - transactionAmount) >= MONEY_EPSILON) {
    throw new Error("Split allocations must equal the transaction amount.");
  }
}
