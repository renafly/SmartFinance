jest.mock("@/repositories/transactions.repository", () => ({
  transactionsRepository: {
    create: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/repositories", () => ({
  repositories: {
    attachments: {
      uploadAndCreate: jest.fn(),
    },
  },
}));

import { transactionsService } from "./transaction.service";
import { repositories } from "@/repositories";
import { transactionsRepository } from "@/repositories/transactions.repository";

const mockCreate = jest.mocked(transactionsRepository.create);
const mockDelete = jest.mocked(transactionsRepository.delete);
const mockUploadAndCreate = jest.mocked(repositories.attachments.uploadAndCreate);

const createdTransaction = {
  id: "transaction-1",
  household_id: "household-1",
  created_by: "profile-1",
  title: "Groceries",
};

describe("transactionsService.createTransaction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(1_710_000_000_000);
    mockCreate.mockResolvedValue({ data: createdTransaction, error: null } as any);
    mockDelete.mockResolvedValue({ data: null, error: null });
    mockUploadAndCreate.mockResolvedValue({ data: { id: "attachment-1" }, error: null } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a transaction without uploading an attachment when none is provided", async () => {
    const input = {
      household_id: "household-1",
      account_id: "account-1",
      created_by: "profile-1",
      title: "Groceries",
      amount: 42,
      type: "expense",
      transaction_date: "2026-07-09T10:00:00.000Z",
    };

    await expect(transactionsService.createTransaction(input as any)).resolves.toBe(createdTransaction);

    expect(mockCreate).toHaveBeenCalledWith(input);
    expect(mockUploadAndCreate).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("uploads an attachment using a sanitized storage path after the transaction is created", async () => {
    const file = new ArrayBuffer(8);

    await transactionsService.createTransaction({
      household_id: "household-1",
      account_id: "account-1",
      created_by: "profile-1",
      title: "Receipt",
      amount: 12,
      type: "expense",
      transaction_date: "2026-07-09T10:00:00.000Z",
      attachment: {
        file,
        fileName: "receipt #1?.pdf",
        fileSize: 2048,
        mimeType: "application/pdf",
      },
    } as any);

    expect(mockUploadAndCreate).toHaveBeenCalledWith({
      bucket: "attachments",
      storagePath:
        "households/household-1/transactions/transaction-1/1710000000000-receipt_1_.pdf",
      file,
      transactionId: "transaction-1",
      uploadedBy: "profile-1",
      fileName: "receipt #1?.pdf",
      fileSize: 2048,
      mimeType: "application/pdf",
    });
  });

  it("rolls back the created transaction when attachment upload/create fails", async () => {
    const attachmentError = new Error("upload failed");
    mockUploadAndCreate.mockResolvedValue({ data: null, error: attachmentError });

    await expect(
      transactionsService.createTransaction({
        household_id: "household-1",
        account_id: "account-1",
        created_by: "profile-1",
        title: "Receipt",
        amount: 12,
        type: "expense",
        transaction_date: "2026-07-09T10:00:00.000Z",
        attachment: {
          file: new ArrayBuffer(8),
          fileName: "receipt.pdf",
          fileSize: 2048,
          mimeType: "application/pdf",
        },
      } as any),
    ).rejects.toThrow(attachmentError);

    expect(mockDelete).toHaveBeenCalledWith("transaction-1");
  });

  it("rejects unsupported attachment types before creating a transaction", async () => {
    await expect(
      transactionsService.createTransaction({
        household_id: "household-1",
        account_id: "account-1",
        created_by: "profile-1",
        title: "Receipt",
        amount: 12,
        type: "expense",
        transaction_date: "2026-07-09T10:00:00.000Z",
        attachment: {
          file: new ArrayBuffer(8),
          fileName: "receipt.exe",
          fileSize: 2048,
          mimeType: "application/octet-stream",
        },
      } as any),
    ).rejects.toThrow("Attachment file type is not supported.");

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUploadAndCreate).not.toHaveBeenCalled();
  });

  it("rejects oversized attachments before creating a transaction", async () => {
    await expect(
      transactionsService.createTransaction({
        household_id: "household-1",
        account_id: "account-1",
        created_by: "profile-1",
        title: "Receipt",
        amount: 12,
        type: "expense",
        transaction_date: "2026-07-09T10:00:00.000Z",
        attachment: {
          file: new ArrayBuffer(8),
          fileName: "receipt.pdf",
          fileSize: 10 * 1024 * 1024 + 1,
          mimeType: "application/pdf",
        },
      } as any),
    ).rejects.toThrow("Attachment file is larger than the 10 MB limit.");

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUploadAndCreate).not.toHaveBeenCalled();
  });
});
