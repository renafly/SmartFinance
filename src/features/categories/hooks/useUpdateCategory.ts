import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateHouseholdData } from "@/lib/query-invalidation";
import { categoriesService } from "../services/categories.service";

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoriesService.updateCategory,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}
