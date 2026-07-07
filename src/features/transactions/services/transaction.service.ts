import { repositories } from "@/repositories";
import { TransactionFilters, transactionsRepository } from "@/repositories/transactions.repository";
import type {
  CreateTransactionDTO,
  UpdateTransactionDTO,
} from "@/features/transactions/types/types";

type CreateTransactionInput = CreateTransactionDTO
  & {
    attachment?: {
      file: Blob | ArrayBuffer | File;
      fileName: string;
      fileSize: number;
      mimeType: string;
    } | null;
  };

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
    const { attachment, ...transactionData } = data;

    const { data: transaction, error } =
      await transactionsRepository.create(transactionData as CreateTransactionDTO);

    if (error) throw error;

    if (attachment) {
      const safeFileName = attachment.fileName.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const storagePath = `${transaction.household_id}/transactions/${transaction.id}/${Date.now()}-${safeFileName}`;

      const attachmentResult = await repositories.attachments.uploadAndCreate({
        bucket: "attachments",
        storagePath,
        file: attachment.file,
        transactionId: transaction.id,
        uploadedBy: transaction.created_by,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
      });

      if (attachmentResult.error) {
        await transactionsRepository.delete(transaction.id);
        throw attachmentResult.error;
      }
    }

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
