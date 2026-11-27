// The fields every transaction needs, validated the same way by the create
// form and the edit modal (they used to repeat their own inline checks).

export type TransactionEssentialsError = "missing_title" | "invalid_amount" | "invalid_date" | "missing_account";

/** "12,50" and "12.50" both mean 12.5 (pt-PT keyboards type a comma);
 * NaN for empty or unparsable input. */
export function parseAmountInput(value: string): number {
  const normalized = value.trim().replace(",", ".");
  // Same shapes Number() used to accept for these fields: "12", "12.5",
  // ".5" and "12." -- but no exponents, signs or second separator.
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

export function validateTransactionEssentials(input: {
  title: string;
  amount: string;
  date: string;
  accountId: string | null | undefined;
}): TransactionEssentialsError[] {
  const errors: TransactionEssentialsError[] = [];
  if (!input.title.trim()) errors.push("missing_title");
  const amount = parseAmountInput(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.push("invalid_amount");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.push("invalid_date");
  if (!input.accountId) errors.push("missing_account");
  return errors;
}

export type TransferEditError = TransactionEssentialsError | "missing_destination" | "same_account";

/** Fields an edited transfer still needs, in form order; empty when it can be saved. */
export function validateTransferEdit(input: {
  title: string;
  amount: string;
  date: string;
  sourceAccountId: string | null | undefined;
  destinationAccountId: string | null | undefined;
}): TransferEditError[] {
  const errors: TransferEditError[] = validateTransactionEssentials({
    title: input.title,
    amount: input.amount,
    date: input.date,
    accountId: input.sourceAccountId,
  });
  if (!input.destinationAccountId) errors.push("missing_destination");
  else if (input.sourceAccountId && input.sourceAccountId === input.destinationAccountId) errors.push("same_account");
  return errors;
}
