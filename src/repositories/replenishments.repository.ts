import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type ReplenishmentRun = Database["public"]["Tables"]["replenishment_runs"]["Row"];
type ReplenishmentRunTransaction =
  Database["public"]["Tables"]["replenishment_run_transactions"]["Row"];
type ReplenishmentRunSource =
  Database["public"]["Tables"]["replenishment_run_sources"]["Row"];

const RUN_DETAIL_SELECT = `
  *,
  transactions:replenishment_run_transactions(
    *,
    account:accounts(id, name),
    category:categories(id, name, icon)
  ),
  sources:replenishment_run_sources(
    *,
    account:accounts!replenishment_run_sources_resolved_account_id_fkey(id, name),
    pot:saving_pots(id, name)
  )
`;

export interface CreateDraftRunInput {
  householdId: string;
  createdBy: string;
  title?: string | null;
  totalAmount: number;
  transactions: {
    transactionId: string;
    accountId: string;
    amount: number;
    categoryId: string | null;
    transactionDate: string;
  }[];
  sources: {
    kind: Database["public"]["Enums"]["replenishment_source_kind"];
    potId: string | null;
    resolvedAccountId: string;
    amount: number;
    suggestedAmount: number;
    sortOrder: number;
  }[];
}

export interface ConfirmReplenishmentRunInput {
  runId: string;
  transfers: {
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    title?: string | null;
    notes?: string | null;
    categoryId?: string | null;
  }[];
  preview: unknown;
}

export class ReplenishmentsRepository extends BaseRepository<"replenishment_runs"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "replenishment_runs");
  }

  /**
   * Creates a draft run plus its covered transactions and chosen sources in
   * one round trip. Replaces (rather than incrementally patches) both child
   * tables on every save, since the wizard always recomputes its full
   * selection/distribution client-side -- matching how `set_saving_pot_accounts`
   * treats "replace the whole set" as the atomic unit of change.
   */
  async saveDraft(
    input: CreateDraftRunInput,
    existingRunId?: string | null,
  ): Promise<RepoResult<ReplenishmentRun>> {
    const runResult = existingRunId
      ? await this.client
          .from("replenishment_runs")
          .update({
            title: input.title ?? null,
            total_amount: input.totalAmount,
          })
          .eq("id", existingRunId)
          .select()
          .single()
      : await this.client
          .from("replenishment_runs")
          .insert({
            household_id: input.householdId,
            created_by: input.createdBy,
            title: input.title ?? null,
            total_amount: input.totalAmount,
            status: "draft",
          })
          .select()
          .single();

    if (runResult.error) return { data: null, error: runResult.error };
    const run = runResult.data as ReplenishmentRun;

    const clearTransactions = await this.client
      .from("replenishment_run_transactions")
      .delete()
      .eq("run_id", run.id);
    if (clearTransactions.error) return { data: null, error: clearTransactions.error };

    const clearSources = await this.client
      .from("replenishment_run_sources")
      .delete()
      .eq("run_id", run.id);
    if (clearSources.error) return { data: null, error: clearSources.error };

    if (input.transactions.length > 0) {
      const { error } = await this.client.from("replenishment_run_transactions").insert(
        input.transactions.map((transaction) => ({
          run_id: run.id,
          transaction_id: transaction.transactionId,
          account_id: transaction.accountId,
          amount: transaction.amount,
          category_id: transaction.categoryId,
          transaction_date: transaction.transactionDate,
        })),
      );
      if (error) return { data: null, error };
    }

    if (input.sources.length > 0) {
      const { error } = await this.client.from("replenishment_run_sources").insert(
        input.sources.map((source) => ({
          run_id: run.id,
          source_kind: source.kind,
          pot_id: source.potId,
          resolved_account_id: source.resolvedAccountId,
          amount: source.amount,
          suggested_amount: source.suggestedAmount,
          sort_order: source.sortOrder,
        })),
      );
      if (error) return { data: null, error };
    }

    return { data: run, error: null };
  }

  async confirmRun(
    input: ConfirmReplenishmentRunInput,
  ): Promise<RepoResult<ReplenishmentRun>> {
    const { data, error } = await this.client.rpc("confirm_replenishment_run", {
      p_run_id: input.runId,
      p_transfers: input.transfers.map((transfer) => ({
        sourceAccountId: transfer.sourceAccountId,
        destinationAccountId: transfer.destinationAccountId,
        amount: transfer.amount,
        title: transfer.title ?? null,
        notes: transfer.notes ?? null,
        categoryId: transfer.categoryId ?? null,
      })),
      p_preview: input.preview,
    } as never);

    if (error) return { data: null, error };
    return { data: data as ReplenishmentRun, error: null };
  }

  async deleteDraft(runId: string): Promise<RepoResult<null>> {
    const { error } = await this.client
      .from("replenishment_runs")
      .delete()
      .eq("id", runId)
      .eq("status", "draft");
    if (error) return { data: null, error };
    return { data: null, error: null };
  }

  async listForHousehold(householdId: string): Promise<RepoResult<ReplenishmentRun[]>> {
    const { data, error } = await this.client
      .from("replenishment_runs")
      .select("*")
      .eq("household_id", householdId)
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: false });

    if (error) return { data: null, error };
    return { data: (data as ReplenishmentRun[]) ?? [], error: null };
  }

  async getDetail(runId: string): Promise<RepoResult<any>> {
    const { data, error } = await this.client
      .from("replenishment_runs")
      .select(RUN_DETAIL_SELECT)
      .eq("id", runId)
      .single();

    if (error) return { data: null, error };

    const transferLegs = await this.client
      .from("transactions")
      .select("account_id, amount, transfer_group_id, type, account:accounts(id, name)")
      .eq("replenishment_run_id", runId);

    if (transferLegs.error) return { data: null, error: transferLegs.error };

    return { data: { ...(data as any), transferLegs: transferLegs.data ?? [] }, error: null };
  }
}

export const replenishmentsRepository = new ReplenishmentsRepository(supabase);
