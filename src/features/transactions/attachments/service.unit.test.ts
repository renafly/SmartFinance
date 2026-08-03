import { repositories } from "@/repositories";

import {
  isImageAttachment,
  listTransactionAttachmentPreviews,
} from "./service";

jest.mock("@/repositories", () => ({
  repositories: {
    attachments: {
      listForTransaction: jest.fn(),
      createSignedUrl: jest.fn(),
    },
  },
}));

const listForTransaction = jest.mocked(
  repositories.attachments.listForTransaction,
);
const createSignedUrl = jest.mocked(repositories.attachments.createSignedUrl);

describe("transaction attachment previews", () => {
  beforeEach(() => jest.clearAllMocks());

  it("recognizes image mime types", () => {
    expect(isImageAttachment("image/jpeg")).toBe(true);
    expect(isImageAttachment("application/pdf")).toBe(false);
    expect(isImageAttachment(null)).toBe(false);
  });

  it("lists attachments with short-lived signed URLs", async () => {
    listForTransaction.mockResolvedValue({
      data: [{ id: "attachment-1", file_name: "invoice.pdf" }],
      error: null,
    } as any);
    createSignedUrl.mockResolvedValue({
      data: "https://example.test/invoice.pdf?token=signed",
      error: null,
    });

    await expect(listTransactionAttachmentPreviews("transaction-1")).resolves.toEqual([
      expect.objectContaining({
        id: "attachment-1",
        signedUrl: "https://example.test/invoice.pdf?token=signed",
      }),
    ]);
    expect(createSignedUrl).toHaveBeenCalledWith(
      "attachment-1",
      "attachments",
      600,
    );
  });

  it("surfaces signed URL failures", async () => {
    const error = new Error("Could not sign attachment");
    listForTransaction.mockResolvedValue({
      data: [{ id: "attachment-1" }],
      error: null,
    } as any);
    createSignedUrl.mockResolvedValue({ data: null, error });

    await expect(
      listTransactionAttachmentPreviews("transaction-1"),
    ).rejects.toThrow(error);
  });
});
