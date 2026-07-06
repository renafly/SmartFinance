import { useQuery } from "@tanstack/react-query";

import { categoriesService } from "../services/categories.service";
import { useAuth } from "@/providers/AuthProvider";
import type { CategoryType } from "@/repositories/categories.repository";

export function useCategories(type?: CategoryType) {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["categories", householdId, type],
    queryFn: () => categoriesService.getCategories(householdId!, type),
    enabled: !!householdId && !isLoading,
  });
}

// Top-level only (parent_id is null) — use this for a flat picker like the
// transaction form, where you don't want subcategories mixed in.
export function useTopLevelCategories(type?: CategoryType) {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["categories", "top-level", householdId, type],
    queryFn: () =>
      categoriesService.getTopLevelCategories(householdId!, type),
    enabled: !!householdId && !isLoading,
  });
}

export function useChildCategories(parentId: string) {
  return useQuery({
    queryKey: ["categories", "children", parentId],
    queryFn: () => categoriesService.getChildren(parentId),
    enabled: !!parentId,
  });
}
