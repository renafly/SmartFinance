import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { categoriesService } from "../services/categories.service";
import { localizeCategory } from "../category-names";
import { useAuth } from "@/providers/AuthProvider";
import type { CategoryType } from "@/repositories/categories.repository";

type CategoryRow = Awaited<ReturnType<typeof categoriesService.getCategories>>[number];

// `includeArchived` defaults to false so every existing caller (transaction
// tagging, filters, bulk edit, transfer forms, ...) keeps getting
// active-only categories — you should never be able to tag something with
// an archived category. Pass `true` only for screens that need to browse or
// manage the full set, like the category browser/parent-picker on the
// Categories screen.
//
// `name` comes back in the app's CURRENT language for default categories
// (see ../category-names.ts); `stored_name` is the raw database value. The
// localization runs in `select`, keyed on `t`, so every screen re-renders
// with translated names as soon as the language changes -- no refetch, no
// restart. The cache itself keeps the raw rows.
export function useCategories(type?: CategoryType, includeArchived = false) {
  const { householdId, isLoading } = useAuth();
  const { t } = useTranslation("common");

  const select = useCallback(
    (categories: CategoryRow[]) => categories.map((category) => localizeCategory(category, t)),
    [t],
  );

  return useQuery({
    queryKey: ["categories", householdId, type, includeArchived],
    queryFn: () =>
      categoriesService.getCategories(householdId!, type, includeArchived),
    enabled: !!householdId && !isLoading,
    select,
  });
}
