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

const ATTACHMENTS_BUCKET = "attachments";
export const MAX_TRANSACTION_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TRANSACTION_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

const ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS = new Map<string, readonly string[]>([
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/png", ["png"]],
  ["image/webp", ["webp"]],
  ["application/pdf", ["pdf"]],
]);

type TransactionAttachmentInput = NonNullable<CreateTransactionInput["attachment"]>;

function getFileExtension(fileName: string) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match?.[1]?.toLowerCase() ?? "";
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, "_");
  const withoutTraversal = normalized.replace(/\.+/g, ".");
  return withoutTraversal && withoutTraversal !== "." ? withoutTraversal : `invoice-${Date.now()}`;
}

export function validateTransactionAttachment(attachment: TransactionAttachmentInput) {
  const allowedExtensions = ALLOWED_TRANSACTION_ATTACHMENT_EXTENSIONS.get(attachment.mimeType);
  const extension = getFileExtension(attachment.fileName);

  if (!attachment.fileSize || attachment.fileSize <= 0) {
    throw new Error("Attachment file is empty.");
  }

  if (attachment.fileSize > MAX_TRANSACTION_ATTACHMENT_BYTES) {
    throw new Error("Attachment file is larger than the 10 MB limit.");
  }

  if (!allowedExtensions || !allowedExtensions.includes(extension)) {
    throw new Error("Attachment file type is not supported.");
  }
}

export function buildTransactionAttachmentPath(params: {
  householdId: string;
  transactionId: string;
  fileName: string;
}) {
  return [
    "households",
    params.householdId,
    "transactions",
    params.transactionId,
    `${Date.now()}-${sanitizeFileName(params.fileName)}`,
  ].join("/");
}

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

    if (attachment) {
      validateTransactionAttachment(attachment);
    }

    const { data: transaction, error } =
      await transactionsRepository.create(transactionData as CreateTransactionDTO);

    if (error) throw error;

    if (attachment) {
      const storagePath = buildTransactionAttachmentPath({
        householdId: transaction.household_id,
        transactionId: transaction.id,
        fileName: attachment.fileName,
      });

      const attachmentResult = await repositories.attachments.uploadAndCreate({
        bucket: ATTACHMENTS_BUCKET,
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
