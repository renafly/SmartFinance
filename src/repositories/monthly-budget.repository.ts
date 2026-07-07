import { BaseRepository, type RepoResult } from "@/repositories/base.repository";
import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type BudgetConfig = Database["public"]["Tables"]["budget_configs"]["Row"];
type BudgetConfigInsert = Database["public"]["Tables"]["budget_configs"]["Insert"];
type BudgetConfigUpdate = Database["public"]["Tables"]["budget_configs"]["Update"];
type BudgetRule = Database["public"]["Tables"]["budget_rules"]["Row"];
type BudgetRuleInsert = Database["public"]["Tables"]["budget_rules"]["Insert"];
type BudgetRuleUpdate = Database["public"]["Tables"]["budget_rules"]["Update"];
type MonthlyBudgetRun = Database["public"]["Tables"]["monthly_budget_runs"]["Row"];
type MonthlyBudgetRunInsert =
  Database["public"]["Tables"]["monthly_budget_runs"]["Insert"];
type MonthlyBudgetRunUpdate =
  Database["public"]["Tables"]["monthly_budget_runs"]["Update"];
type MonthlyIncomeInput =
  Database["public"]["Tables"]["monthly_income_inputs"]["Row"];
type MonthlyIncomeInputInsert =
  Database["public"]["Tables"]["monthly_income_inputs"]["Insert"];

export type BudgetConfigWithRules = BudgetConfig & {
  rules: BudgetRule[];
};

export class MonthlyBudgetRepository extends BaseRepository<"budget_configs"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "budget_configs");
  }

  async listForHousehold(householdId: string): Promise<RepoResult<BudgetConfig[]>> {
    const { data, error } = await this.client
      .from("budget_configs")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async getActiveConfig(householdId: string): Promise<RepoResult<BudgetConfig | null>> {
    const { data, error } = await this.client
      .from("budget_configs")
      .select("*")
      .eq("household_id", householdId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: (data as BudgetConfig | null) ?? null, error: null };
  }

  async getActiveConfigWithRules(householdId: string): Promise<RepoResult<BudgetConfigWithRules | null>> {
    const configResult = await this.getActiveConfig(householdId);
    if (configResult.error) return configResult;

    if (!configResult.data) {
      return { data: null, error: null };
    }

    const rulesResult = await this.listRules(configResult.data.id);
    if (rulesResult.error) return { data: null, error: rulesResult.error };

    return {
      data: {
        ...configResult.data,
        rules: rulesResult.data ?? [],
      },
      error: null,
    };
  }

  async saveConfig(input: BudgetConfigInsert, id?: string): Promise<RepoResult<BudgetConfig>> {
    if (id) {
      const { data, error } = await this.client
        .from("budget_configs")
        .update(input as BudgetConfigUpdate)
        .eq("id", id)
        .select()
        .single();

      if (error) return { data: null, error };
      return { data, error: null };
    }

    const { data, error } = await this.client
      .from("budget_configs")
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  }

  async deactivateHouseholdConfigs(householdId: string): Promise<RepoResult<null>> {
    const { error } = await this.client
      .from("budget_configs")
      .update({ is_active: false })
      .eq("household_id", householdId);

    if (error) return { data: null, error };
    return { data: null, error: null };
  }

  async listRules(budgetConfigId: string): Promise<RepoResult<BudgetRule[]>> {
    const { data, error } = await this.client
      .from("budget_rules")
      .select("*")
      .eq("budget_config_id", budgetConfigId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async replaceRules(
    budgetConfigId: string,
    rules: BudgetRuleInsert[],
  ): Promise<RepoResult<BudgetRule[]>> {
    const deleteResult = await this.client
      .from("budget_rules")
      .delete()
      .eq("budget_config_id", budgetConfigId);

    if (deleteResult.error) return { data: null, error: deleteResult.error };

    if (rules.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await this.client
      .from("budget_rules")
      .insert(rules)
      .select("*");

    if (error) return { data: null, error };
    return { data: (data ?? []) as BudgetRule[], error: null };
  }

  async listRuns(householdId: string): Promise<RepoResult<MonthlyBudgetRun[]>> {
    const { data, error } = await this.client
      .from("monthly_budget_runs")
      .select("*")
      .eq("household_id", householdId)
      .order("month", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async getRunById(id: string): Promise<RepoResult<MonthlyBudgetRun | null>> {
    const { data, error } = await this.client
      .from("monthly_budget_runs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: (data as MonthlyBudgetRun | null) ?? null, error: null };
  }

  async createRun(input: MonthlyBudgetRunInsert): Promise<RepoResult<MonthlyBudgetRun>> {
    const { data, error } = await this.client
      .from("monthly_budget_runs")
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  }

  async updateRun(id: string, input: MonthlyBudgetRunUpdate): Promise<RepoResult<MonthlyBudgetRun>> {
    const { data, error } = await this.client
      .from("monthly_budget_runs")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  }

  async listIncomeInputs(
    monthlyBudgetRunId: string,
  ): Promise<RepoResult<MonthlyIncomeInput[]>> {
    const { data, error } = await this.client
      .from("monthly_income_inputs")
      .select("*")
      .eq("monthly_budget_run_id", monthlyBudgetRunId)
      .order("created_at", { ascending: true });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async replaceIncomeInputs(
    monthlyBudgetRunId: string,
    inputs: MonthlyIncomeInputInsert[],
  ): Promise<RepoResult<MonthlyIncomeInput[]>> {
    const deleteResult = await this.client
      .from("monthly_income_inputs")
      .delete()
      .eq("monthly_budget_run_id", monthlyBudgetRunId);

    if (deleteResult.error) return { data: null, error: deleteResult.error };

    if (inputs.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await this.client
      .from("monthly_income_inputs")
      .insert(inputs)
      .select();

    if (error) return { data: null, error };
    return { data: (data ?? []) as MonthlyIncomeInput[], error: null };
  }
}

export const monthlyBudgetRepository = new MonthlyBudgetRepository(supabase);
