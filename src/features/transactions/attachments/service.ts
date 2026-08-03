import { repositories } from "@/repositories";
import type { Database } from "@/types/database.types";

const ATTACHMENTS_BUCKET = "attachments";
const ATTACHMENT_URL_TTL_SECONDS = 10 * 60;

type Attachment = Database["public"]["Tables"]["attachments"]["Row"];

export type TransactionAttachmentPreview = Attachment & {
  signedUrl: string;
};

export function isImageAttachment(mimeType: string | null) {
  return mimeType?.startsWith("image/") ?? false;
}

export async function listTransactionAttachmentPreviews(
  transactionId: string,
): Promise<TransactionAttachmentPreview[]> {
  const result = await repositories.attachments.listForTransaction(transactionId);
  if (result.error) throw result.error;

  return Promise.all(
    (result.data ?? []).map(async (attachment) => {
      const signedUrlResult = await repositories.attachments.createSignedUrl(
        attachment.id,
        ATTACHMENTS_BUCKET,
        ATTACHMENT_URL_TTL_SECONDS,
      );
      if (signedUrlResult.error) throw signedUrlResult.error;

      return { ...attachment, signedUrl: signedUrlResult.data };
    }),
  );
}
