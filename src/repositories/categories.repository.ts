import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];
export type CategoryType = "income" | "expense" | "account";

export class CategoriesRepository extends BaseRepository<"categories"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "categories");
  }

  async listForHousehold(
    householdId: string,
    type?: CategoryType,
    includeArchived = false,
  ): Promise<RepoResult<Category[]>> {
    let query = this.client
      .from("categories")
      .select("*")
      .eq("household_id", householdId)
      .eq("is_archived", includeArchived)
      .order("sort_order", { ascending: true });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;
    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  /** Top-level categories only (parent_id is null). */
  async listTopLevel(
    householdId: string,
    type?: CategoryType,
    includeArchived = false,
  ): Promise<RepoResult<Category[]>> {
    let query = this.client
      .from("categories")
      .select("*")
      .eq("household_id", householdId)
      .is("parent_id", null)
      .eq("is_archived", includeArchived)
      .order("sort_order", { ascending: true });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;
    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  /** Direct children of a given category. */
  async listChildren(parentId: string): Promise<RepoResult<Category[]>> {
    const { data, error } = await this.client
      .from("categories")
      .select("*")
      .eq("parent_id", parentId)
      .order("sort_order", { ascending: true });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async archive(id: string): Promise<RepoResult<Category>> {
    return this.update(id, { is_archived: true } as any);
  }

  async restore(id: string): Promise<RepoResult<Category>> {
    return this.update(id, { is_archived: false } as any);
  }

  async updateCategory(
    id: string,
    values: Pick<CategoryUpdate, "name" | "type" | "icon" | "parent_id">
  ): Promise<RepoResult<Category>> {
    return this.update(id, values);
  }
}
