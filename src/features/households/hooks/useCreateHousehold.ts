import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdsService } from "@/features/households/services/households.service";
import { useAuth } from "@/providers/AuthProvider";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

export function useCreateHousehold() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: (name: string) => householdsService.createHousehold(name),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
      void refreshSession();
    },
  });
}
