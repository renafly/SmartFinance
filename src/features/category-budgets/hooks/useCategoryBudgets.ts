import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";

import { categoryBudgetsService } from "../services/category-budgets.service";
import type { CategoryBudgetDraft } from "../types";

/** Every category's active limit as of `month` -- see resolveActiveCategoryBudgets (category-budget-view-model.ts) for how this raw, full-history list is reduced to "the one active row per category". */
export function useCategoryBudgets(month?: string | null) {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["category-budgets", householdId, month],
    queryFn: () => categoryBudgetsService.getEffectiveBudgets(householdId!, month!),
    enabled: !!householdId && !!month && !isLoading,
  });
}

/** Sets (or changes) a category's monthly limit -- always inserts a new effective-dated row, never updates one in place (see the migration's own comment on category_budgets and setCategoryBudget's doc comment). */
export function useSetCategoryBudget() {
  const queryClient = useQueryClient();
  const { householdId, profile } = useAuth();

  return useMutation({
    mutationFn: (draft: CategoryBudgetDraft) =>
      categoryBudgetsService.setCategoryBudget(draft, { householdId: householdId!, createdBy: profile!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-budgets"] });
    },
  });
}
