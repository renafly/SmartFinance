import { useMutation, useQueryClient } from "@tanstack/react-query";

import { categoriesService } from "../services/categories.service";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

/** Adds missing default categories / fixes the default tree for a household (server-side, idempotent). */
export function useRestoreDefaultCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ householdId, locale }: { householdId: string; locale?: string }) =>
      categoriesService.restoreDefaultCategories(householdId, locale),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}
