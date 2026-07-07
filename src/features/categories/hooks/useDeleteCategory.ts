import { useMutation, useQueryClient } from "@tanstack/react-query";

import { categoriesService } from "../services/categories.service";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoriesService.deleteCategory,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}
