import { repositories } from "@/repositories";
import type { CategoryType } from "@/repositories/categories.repository";

class CategoriesService {
  async getCategories(householdId: string, type?: CategoryType) {
    const { data, error } = await repositories.categories.listForHousehold(
      householdId,
      type,
      false
    );

    if (error) throw error;

    return data ?? [];
  }

  async getTopLevelCategories(householdId: string, type?: CategoryType) {
    const { data, error } = await repositories.categories.listTopLevel(
      householdId,
      type,
      false
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

  async createCategory(input: {
    household_id: string;
    name: string;
    type: CategoryType;
    icon?: string | null;
    color?: string | null;
    parent_id?: string | null;
    sort_order?: number;
  }) {
    const { data, error } = await repositories.categories.create({
      household_id: input.household_id,
      name: input.name,
      type: input.type,
      icon: input.icon ?? null,
      color: input.color ?? null,
      parent_id: input.parent_id ?? null,
      sort_order: input.sort_order ?? 0,
      is_default: false,
    });

    if (error) throw error;

    return data;
  }

  async archiveCategory(id: string) {
    const { data, error } = await repositories.categories.archive(id);

    if (error) throw error;

    return data;
  }

  async restoreCategory(id: string) {
    const { data, error } = await repositories.categories.restore(id);

    if (error) throw error;

    return data;
  }

  async deleteCategory(id: string) {
    const { data, error } = await repositories.categories.delete(id);

    if (error) throw error;

    return data;
  }
}

export const categoriesService = new CategoriesService();
