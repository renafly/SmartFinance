import { repositories } from "@/shared/lib/repositories";
import type { Database } from "@/shared/types/database.types";

type TransactionType = Database["public"]["Enums"]["transaction_type"];

class CategoriesService {
  async getCategories(householdId: string, type?: TransactionType) {
    const { data, error } = await repositories.categories.listForHousehold(
      householdId,
      type
    );

    if (error) throw error;

    return data ?? [];
  }

  async getTopLevelCategories(householdId: string, type?: TransactionType) {
    const { data, error } = await repositories.categories.listTopLevel(
      householdId,
      type
    );

    if (error) throw error;

    return data ?? [];
  }

  async getChildren(parentId: string) {
    const { data, error } = await repositories.categories.listChildren(
      parentId
    );

    if (error) throw error;

    return data ?? [];
  }
}

export const categoriesService = new CategoriesService();