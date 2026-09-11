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
