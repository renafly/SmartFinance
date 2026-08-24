import { useMutation, useQueryClient } from "@tanstack/react-query";

import { replenishmentService } from "../services/replenishment.service";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

/** Confirms a draft replenishment run via the atomic, retry-safe
 * confirm_replenishment_run RPC. Safe to call again after a network failure
 * -- the RPC is idempotent once the run reaches 'confirmed'. */
export function useConfirmReplenishment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: replenishmentService.confirmRun,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["replenishments"] });
    },
  });
}
