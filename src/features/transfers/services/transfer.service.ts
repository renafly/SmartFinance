import { transactionsRepository } from "@/repositories/transactions.repository";

type CreateTransferInput = {
  householdId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  title: string;
  categoryId?: string | null;
  notes?: string | null;
  transactionDate?: string;
  createdBy: string;
};

class TransferService {
  async createTransfer(input: CreateTransferInput) {
    const { data, error } = await transactionsRepository.createTransfer({
      ...input,
      notes: input.notes ?? undefined,
      categoryId: input.categoryId ?? null,
    });

    if (error) throw error;

    return data;
  }
}

export const transferService = new TransferService();
