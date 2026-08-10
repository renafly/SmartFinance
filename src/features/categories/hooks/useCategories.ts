import { useQuery } from "@tanstack/react-query";

import { categoriesService } from "../services/categories.service";
import { useAuth } from "@/providers/AuthProvider";
import type { CategoryType } from "@/repositories/categories.repository";

// `includeArchived` defaults to false so every existing caller (transaction
// tagging, filters, bulk edit, transfer forms, ...) keeps getting
// active-only categories — you should never be able to tag something with
// an archived category. Pass `true` only for screens that need to browse or
// manage the full set, like the category browser/parent-picker on the
// Categories screen.
export function useCategories(type?: CategoryType, includeArchived = false) {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["categories", householdId, type, includeArchived],
    queryFn: () =>
      categoriesService.getCategories(householdId!, type, includeArchived),
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
