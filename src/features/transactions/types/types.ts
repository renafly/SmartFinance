import type { Database } from '@/types/database.types'

import type { TransactionWithRelations } from "@/repositories/transactions.repository";
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];

export type Transaction = TransactionWithRelations;
export type CreateTransactionDTO = TransactionInsert;
export type UpdateTransactionDTO = TransactionUpdate;
