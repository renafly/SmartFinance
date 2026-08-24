import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";
import { replenishmentService } from "../services/replenishment.service";

export function useReplenishmentHistory() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["replenishments", householdId],
    queryFn: () => replenishmentService.listRuns(householdId!),
    enabled: !!householdId && !isLoading,
  });
}

export function useReplenishmentDetail(runId: string | null) {
  return useQuery({
    queryKey: ["replenishments", "detail", runId],
    queryFn: () => replenishmentService.getRunDetail(runId!),
    enabled: !!runId,
  });
}
