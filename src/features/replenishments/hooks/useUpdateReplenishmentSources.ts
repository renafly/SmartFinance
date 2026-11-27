import { useMutation, useQueryClient } from "@tanstack/react-query";

import { replenishmentService } from "../services/replenishment.service";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

/** Changes which account funds each covered transaction of a confirmed
 * replenishment run (update_replenishment_run_sources). Moves real money
 * between accounts, so every household-wide query (balances, transaction
 * lists) is invalidated, not just the replenishment ones. */
export function useUpdateReplenishmentSources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: replenishmentService.updateRunSources,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["replenishments"] });
    },
  });
}
