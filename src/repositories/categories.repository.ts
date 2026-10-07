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

  // `includeArchived` used to be passed straight into `.eq("is_archived",
  // includeArchived)`, which can only ever match ONE exact boolean value —
  // `includeArchived: true` returned archived-only, not "active AND
  // archived" like the parameter name promises (and every caller assumed).
  // Fixed to match the same pattern accounts.repository.ts already uses:
  // omit the archived filter entirely when includeArchived is true, so both
  // are returned; otherwise filter down to active-only.
  async listForHousehold(
    householdId: string,
    type?: CategoryType,
    includeArchived = false,
  ): Promise<RepoResult<Category[]>> {
    let query = this.client
      .from("categories")
      .select("*")
      .eq("household_id", householdId)
      .order("sort_order", { ascending: true });

    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }

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
      .order("sort_order", { ascending: true });

    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }

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

  /**
   * Adds any missing default categories and brings existing ones in line with
   * the default tree (names, icons, parents), merging duplicates -- never
   * deletes or duplicates anything. The tree itself lives in the database
   * (default_category_catalog); see 20261007000000_default_categories_v2.sql.
   */
  async restoreDefaults(
    householdId: string,
    locale?: string,
  ): Promise<RepoResult<null>> {
    const { error } = await this.client.rpc("restore_default_categories", {
      p_household_id: householdId,
      ...(locale ? { p_locale: locale } : {}),
    });

    if (error) return { data: null, error };
    return { data: null, error: null };
  }

  async updateCategory(
    id: string,
    values: Pick<
      CategoryUpdate,
      "name" | "type" | "icon" | "parent_id" | "is_discretionary"
    >
  ): Promise<RepoResult<Category>> {
    return this.update(id, values);
  }
}
