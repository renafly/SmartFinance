import type { Database } from '@/shared/types/database.types'

import type { TransactionWithRelations } from "@/shared/lib/repositories/transactions.repository";
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];

export type Transaction = TransactionWithRelations;
export type CreateTransactionDTO = TransactionInsert;
export type UpdateTransactionDTO = TransactionUpdate;