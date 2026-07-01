import { transactionsRepository } from "@/shared/lib/repositories/transactions.repository";
import { useSession } from "@/shared/session";

type CreateTransferInput = {
  householdId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  title: string;
  notes?: string | null;
  transactionDate?: string;
  createdBy: string;
};

class TransferService {
  async createTransfer(input: CreateTransferInput) {
    const { data, error } = await transactionsRepository.createTransfer(input);

    if (error) throw error;

    return data;
  }
}

export const transferService = new TransferService();