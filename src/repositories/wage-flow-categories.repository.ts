import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WageFlowCategoryRow =
  Database["public"]["Tables"]["wage_flow_categories"]["Row"];
export type WageFlowCategoryInsert =
  Database["public"]["Tables"]["wage_flow_categories"]["Insert"];
export type WageFlowCategoryUpdate =
  Database["public"]["Tables"]["wage_flow_categories"]["Update"];

export class WageFlowCategoriesRepository extends BaseRepository<"wage_flow_categories"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "wage_flow_categories");
  }

  async listForHousehold(
    householdId: string,
  ): Promise<RepoResult<WageFlowCategoryRow[]>> {
    const { data, error } = await this.client
      .from("wage_flow_categories")
      .select("*")
      .eq("household_id", householdId)
      .order("sort_order", { ascending: true });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async createMany(
    rows: WageFlowCategoryInsert[],
  ): Promise<RepoResult<WageFlowCategoryRow[]>> {
    const { data, error } = await this.client
      .from("wage_flow_categories")
      .insert(rows)
      .select();

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  /** Persists a new sort_order for each id, in the order given -- used when
   * the user reorders categories (also the first-match-wins precedence). */
  async reorder(
    householdId: string,
    orderedIds: string[],
  ): Promise<RepoResult<null>> {
    const results = await Promise.all(
      orderedIds.map((id, index) =>
        this.client
          .from("wage_flow_categories")
          .update({ sort_order: index })
          .eq("id", id)
          .eq("household_id", householdId),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) return { data: null, error: failed.error };
    return { data: null, error: null };
  }
}
