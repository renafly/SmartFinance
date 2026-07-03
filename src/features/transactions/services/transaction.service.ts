import { TransactionFilters, transactionsRepository } from "@/shared/lib/repositories/transactions.repository";
import type {
  CreateTransactionDTO,
  UpdateTransactionDTO,
} from "@/features/transactions/types/types";

type CreateTransactionInput = CreateTransactionDTO

type UpdateTransactionInput = {
  id: string;
  data: UpdateTransactionDTO;
};

class TransactionsService {
  async getTransactions(householdId: string, filters: TransactionFilters = {}) {
    const { data, error } =
      await transactionsRepository.listForHousehold(householdId, filters);

    if (error) throw error;

    return data ?? [];
  }

  async getTransaction(id: string) {
    const { data, error } = await transactionsRepository.findByIdWithRelations(id);

    if (error) throw error;

    return data;
  }

  async createTransaction(data: CreateTransactionInput) {
    const { data: transaction, error } =
      await transactionsRepository.create(data);

    if (error) throw error;

    return transaction;
  }

  async updateTransaction({
    id,
    data,
    }: UpdateTransactionInput) {
    const result = await transactionsRepository.update(id, data);

    if (result.error) throw result.error;

    return result.data;
  }

  async deleteTransaction(id: string) {
    const { data, error } =
      await transactionsRepository.delete(id);

    if (error) throw error;

    return data;
  }
}

export const transactionsService = new TransactionsService();