import { useMutation, useQueryClient } from "@tanstack/react-query";

import { categoriesService } from "../services/categories.service";

export function useArchiveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoriesService.archiveCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}