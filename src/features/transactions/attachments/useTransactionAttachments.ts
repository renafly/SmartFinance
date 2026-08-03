import { useQuery } from "@tanstack/react-query";

import { listTransactionAttachmentPreviews } from "./service";

export function useTransactionAttachments(transactionId?: string) {
  return useQuery({
    queryKey: ["attachments", "transaction", transactionId],
    queryFn: () => listTransactionAttachmentPreviews(transactionId!),
    enabled: Boolean(transactionId),
    staleTime: 4 * 60 * 1000,
  });
}
