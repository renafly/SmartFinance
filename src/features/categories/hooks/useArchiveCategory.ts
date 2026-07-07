import { useMutation, useQueryClient } from "@tanstack/react-query";

import { categoriesService } from "../services/categories.service";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

export function useArchiveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoriesService.archiveCategory,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}
