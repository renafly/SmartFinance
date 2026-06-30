import { useQuery } from "@tanstack/react-query";

import { categoriesService } from "../services/categories.service";
import { useSession } from "@/shared/session";
import type { Database } from "@/shared/types/database.types";

type TransactionType = Database["public"]["Enums"]["transaction_type"];

export function useCategories(type?: TransactionType) {
  const { data: session, isPending: sessionLoading } = useSession();

  const householdId = session?.household.id;

  return useQuery({
    queryKey: ["categories", householdId, type],
    queryFn: () => categoriesService.getCategories(householdId!, type),
    enabled: !!householdId && !sessionLoading,
  });
}

// Top-level only (parent_id is null) — use this for a flat picker like the
// transaction form, where you don't want subcategories mixed in.
export function useTopLevelCategories(type?: TransactionType) {
  const { data: session, isPending: sessionLoading } = useSession();

  const householdId = session?.household.id;

  return useQuery({
    queryKey: ["categories", "top-level", householdId, type],
    queryFn: () =>
      categoriesService.getTopLevelCategories(householdId!, type),
    enabled: !!householdId && !sessionLoading,
  });
}

export function useChildCategories(parentId: string) {
  return useQuery({
    queryKey: ["categories", "children", parentId],
    queryFn: () => categoriesService.getChildren(parentId),
    enabled: !!parentId,
  });
}