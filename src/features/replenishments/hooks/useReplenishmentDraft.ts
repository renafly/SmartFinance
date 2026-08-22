import { useMutation, useQueryClient } from "@tanstack/react-query";

import { replenishmentService } from "../services/replenishment.service";
import type { CreateDraftRunInput } from "@/repositories/replenishments.repository";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

/** Persists the wizard's current selection/distribution as a draft run.
 * Called after each of steps 1-4 so the draft is always resumable and so
 * the final confirm step has a real run_id to pass to confirm_replenishment_run. */
export function useSaveReplenishmentDraft() {
  return useMutation({
    mutationFn: ({
      input,
      existingRunId,
    }: {
      input: CreateDraftRunInput;
      existingRunId?: string | null;
    }) => replenishmentService.saveDraft(input, existingRunId),
  });
}

export function useDeleteReplenishmentDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => replenishmentService.deleteDraft(runId),
    onSuccess: () => invalidateHouseholdData(queryClient),
  });
}
