import type { Database } from "@/types/database.types";

// The database's income/expense/transfer enum. Shared here so the app-code
// alias isn't independently redeclared (identically) in every feature that
// needs it -- import this instead of re-typing
// `Database["public"]["Enums"]["transaction_type"]`.
//
// Not to be confused with src/features/transfers/types.ts's own
// TransactionType, which is a narrower, semantically different
// 'income' | 'expense' union scoped to the transfer/recurring-transfer
// wizard's own draft shape (no 'transfer' member) -- that one stays separate
// on purpose.
export type TransactionType = Database["public"]["Enums"]["transaction_type"];
