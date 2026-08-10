import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";

import { wageFlowCategoriesService } from "../services/wage-flow-categories.service";
import type { WageFlowCategoryConfig } from "../wage-flow";

function useWageFlowCategoriesQueryKey() {
  const { householdId } = useAuth();
  return ["wage-flow-categories", householdId] as const;
}

export function useWageFlowCategories() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["wage-flow-categories", householdId],
    queryFn: () => wageFlowCategoriesService.list(householdId!),
    enabled: !!householdId && !isLoading,
  });
}

function useInvalidateWageFlowCategories() {
  const queryClient = useQueryClient();
  const queryKey = useWageFlowCategoriesQueryKey();
  return () => queryClient.invalidateQueries({ queryKey });
}

/** Inserts the household's starting set of categories. Only meant to be
 * called once, when a household has none saved yet. */
export function useSeedWageFlowCategoryDefaults() {
  const { householdId } = useAuth();
  const invalidate = useInvalidateWageFlowCategories();

  return useMutation({
    mutationFn: (defaults: WageFlowCategoryConfig[]) =>
      wageFlowCategoriesService.seedDefaults(householdId!, defaults),
    onSuccess: invalidate,
  });
}

/** Bulk-creates several new Wage Flow categories at once, appended after
 * `startingSortOrder` -- used by the "Add all main categories" action. */
export function useCreateManyWageFlowCategories() {
  const { householdId } = useAuth();
  const invalidate = useInvalidateWageFlowCategories();

  return useMutation({
    mutationFn: ({
      configs,
      startingSortOrder,
    }: {
      configs: WageFlowCategoryConfig[];
      startingSortOrder: number;
    }) => wageFlowCategoriesService.createMany(householdId!, configs, startingSortOrder),
    onSuccess: invalidate,
  });
}

export function useCreateWageFlowCategory() {
  const { householdId } = useAuth();
  const invalidate = useInvalidateWageFlowCategories();

  return useMutation({
    mutationFn: ({
      config,
      sortOrder,
    }: {
      config: WageFlowCategoryConfig;
      sortOrder: number;
    }) => wageFlowCategoriesService.create(householdId!, config, sortOrder),
    onSuccess: invalidate,
  });
}

export function useUpdateWageFlowCategory() {
  const invalidate = useInvalidateWageFlowCategories();

  return useMutation({
    mutationFn: ({ id, config }: { id: string; config: WageFlowCategoryConfig }) =>
      wageFlowCategoriesService.update(id, config),
    onSuccess: invalidate,
  });
}

export function useDeleteWageFlowCategory() {
  const invalidate = useInvalidateWageFlowCategories();

  return useMutation({
    mutationFn: (id: string) => wageFlowCategoriesService.remove(id),
    onSuccess: invalidate,
  });
}

export function useReorderWageFlowCategories() {
  const { householdId } = useAuth();
  const invalidate = useInvalidateWageFlowCategories();

  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      wageFlowCategoriesService.reorder(householdId!, orderedIds),
    onSuccess: invalidate,
  });
}
