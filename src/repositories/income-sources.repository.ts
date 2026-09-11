import { BaseRepository, type RepoResult } from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type IncomeSource = Database["public"]["Tables"]["income_sources"]["Row"];
export type IncomeSourceInsert = Database["public"]["Tables"]["income_sources"]["Insert"];
export type IncomeSourceUpdate = Database["public"]["Tables"]["income_sources"]["Update"];

export type IncomeSourceWithRelations = IncomeSource & {
  destination_account: Pick<Database["public"]["Tables"]["accounts"]["Row"], "id" | "name"> | null;
  category:
    | Pick<Database["public"]["Tables"]["categories"]["Row"], "id" | "name" | "icon" | "parent_id">
    | null;
};

const INCOME_SOURCE_WITH_RELATIONS_SELECT =
  "*, destination_account:accounts!destination_account_id(id, name), category:categories(id, name, icon, parent_id)";

/**
 * Named, recurring or one-time income sources feeding the Monthly Budget
 * overview (see supabase/migrations/20260901001000_income_sources.sql).
 * Deliberately a plain CRUD table, mirroring `recurring_expenses` --
 * "is this source due in month X" is computed client-side (see
 * src/features/income-sources/utils.ts / src/features/shared/recurrence.ts)
 * rather than by a server-side scheduler. Unlike recurring_expenses, a due
 * income source DOES generate a real transaction once a month is confirmed
 * (see monthly-budget.service.ts's saveDraftRun / the
 * confirm_monthly_budget_run RPC), the same way household wages already
 * did before this table existed -- it's the planning/definition side of
 * that flow, not a second execution engine.
 */
export class IncomeSourcesRepository extends BaseRepository<"income_sources"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "income_sources");
  }

  async listForHousehold(householdId: string): Promise<RepoResult<IncomeSourceWithRelations[]>> {
    const { data, error } = await this.client
      .from("income_sources")
      .select(INCOME_SOURCE_WITH_RELATIONS_SELECT)
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) return { data: null, error };
    return {
      data: (data ?? []) as unknown as IncomeSourceWithRelations[],
      error: null,
    };
  }

  async softDelete(id: string): Promise<RepoResult<IncomeSource>> {
    return this.update(id, { deleted_at: new Date().toISOString() });
  }

  async setPaused(id: string, isPaused: boolean): Promise<RepoResult<IncomeSource>> {
    return this.update(id, { is_paused: isPaused });
  }
}
