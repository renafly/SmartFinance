import { BaseRepository, type RepoResult } from "@/repositories/base.repository";
import type { Database, Json } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PlannedItemRow = Database["public"]["Tables"]["planned_items"]["Row"];
export type PlannedItemInsert = Database["public"]["Tables"]["planned_items"]["Insert"];
export type PlannedItemUpdate = Database["public"]["Tables"]["planned_items"]["Update"];
export type PlannedItemDestinationRow = Database["public"]["Tables"]["planned_item_destinations"]["Row"];
export type PlannedItemDestinationInsert = Database["public"]["Tables"]["planned_item_destinations"]["Insert"];
export type PlannedItemOccurrenceRow = Database["public"]["Tables"]["planned_item_occurrences"]["Row"];
export type PlannedItemOccurrenceDestinationRow =
  Database["public"]["Tables"]["planned_item_occurrence_destinations"]["Row"];
export type PlannedItemMatchRow = Database["public"]["Tables"]["planned_item_matches"]["Row"];
export type MonthlyBudgetPeriodRow = Database["public"]["Tables"]["monthly_budget_periods"]["Row"];

export type PlannedItemRowWithDestinations = PlannedItemRow & {
  planned_item_destinations: PlannedItemDestinationRow[];
};

const PLANNED_ITEM_WITH_DESTINATIONS_SELECT = "*, planned_item_destinations(*)";

/**
 * CRUD + RPC-calling repository for the Phase 3 Monthly Budget rebuild
 * (planned_items / planned_item_destinations / planned_item_occurrences /
 * planned_item_occurrence_destinations / planned_item_matches /
 * monthly_budget_periods). Mirrors income-sources.repository.ts /
 * recurring-expenses.repository.ts for the plain-CRUD half, and
 * monthly-budget.repository.ts's confirmRunAtomically/deleteRunTransactions
 * for the RPC-calling half -- the resolver
 * (services/planned-items-resolver.ts) does every bit of amount/split
 * math client-side; every RPC below just persists what it's handed.
 */
export class PlannedItemsRepository extends BaseRepository<"planned_items"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "planned_items");
  }

  // ------------------------------------------------------------
  // planned_items + planned_item_destinations (template)
  // ------------------------------------------------------------

  async listForHousehold(householdId: string): Promise<RepoResult<PlannedItemRowWithDestinations[]>> {
    const { data, error } = await this.client
      .from("planned_items")
      .select(PLANNED_ITEM_WITH_DESTINATIONS_SELECT)
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) return { data: null, error };
    return { data: (data ?? []) as unknown as PlannedItemRowWithDestinations[], error: null };
  }

  async getWithDestinations(id: string): Promise<RepoResult<PlannedItemRowWithDestinations>> {
    const { data, error } = await this.client
      .from("planned_items")
      .select(PLANNED_ITEM_WITH_DESTINATIONS_SELECT)
      .eq("id", id)
      .single();

    if (error) return { data: null, error };
    return { data: data as unknown as PlannedItemRowWithDestinations, error: null };
  }

  /** Inserts the planned_items row, then its destination rows (if any) -- two statements, not one RPC, since there is no cross-row invariant here that needs a single transaction (the deferred constraint triggers on planned_item_destinations validate themselves at commit regardless of statement count within this same request). */
  async createWithDestinations(
    item: PlannedItemInsert,
    destinations: Array<Omit<PlannedItemDestinationInsert, "planned_item_id">>,
  ): Promise<RepoResult<PlannedItemRowWithDestinations>> {
    const created = await this.create(item);
    if (created.error) return { data: null, error: created.error };

    if (destinations.length > 0) {
      const { error: destinationsError } = await this.client
        .from("planned_item_destinations")
        .insert(destinations.map((destination) => ({ ...destination, planned_item_id: created.data.id })));
      if (destinationsError) return { data: null, error: destinationsError };
    }

    return this.getWithDestinations(created.data.id);
  }

  /** Updates the planned_items row, then (when `destinations` is provided) replaces the full destination set by delete-then-insert -- same replace-in-place pattern as monthly-budget.repository.ts's replaceIncomeInputs. Pass `undefined` for `destinations` to leave the existing set untouched (e.g. a rename that doesn't touch allocation). */
  async updateWithDestinations(
    id: string,
    item: PlannedItemUpdate,
    destinations: Array<Omit<PlannedItemDestinationInsert, "planned_item_id">> | undefined,
  ): Promise<RepoResult<PlannedItemRowWithDestinations>> {
    const { error: updateError } = await this.client.from("planned_items").update(item).eq("id", id);
    if (updateError) return { data: null, error: updateError };

    if (destinations) {
      const { error: deleteError } = await this.client
        .from("planned_item_destinations")
        .delete()
        .eq("planned_item_id", id);
      if (deleteError) return { data: null, error: deleteError };

      if (destinations.length > 0) {
        const { error: insertError } = await this.client
          .from("planned_item_destinations")
          .insert(destinations.map((destination) => ({ ...destination, planned_item_id: id })));
        if (insertError) return { data: null, error: insertError };
      }
    }

    return this.getWithDestinations(id);
  }

  async softDelete(id: string): Promise<RepoResult<PlannedItemRow>> {
    return this.update(id, { deleted_at: new Date().toISOString() });
  }

  async setActive(id: string, isActive: boolean): Promise<RepoResult<PlannedItemRow>> {
    return this.update(id, { is_active: isActive });
  }

  // ------------------------------------------------------------
  // planned_item_occurrences (+ destinations, matches) -- read side.
  // Writes to these tables only ever happen through the RPCs below.
  // ------------------------------------------------------------

  async listOccurrencesForMonth(
    householdId: string,
    month: string,
  ): Promise<RepoResult<PlannedItemOccurrenceRow[]>> {
    const { data, error } = await this.client
      .from("planned_item_occurrences")
      .select("*")
      .eq("household_id", householdId)
      .eq("month", month);

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  /**
   * Every occurrence for this household, with no month filter -- used by
   * the forecast layer (planned-item-forecast-contributions.ts) to know,
   * for any future month a planned item might be due in, whether that
   * month's occurrence already exists and what state it settled to
   * (confirmed/matched/skipped/cancelled vs. still 'planned'). Small and
   * bounded in practice (one row per planned item per month since the
   * item was created), unlike listOccurrencesForMonth's single-month scope.
   */
  async listOccurrencesForHousehold(
    householdId: string,
  ): Promise<RepoResult<PlannedItemOccurrenceRow[]>> {
    const { data, error } = await this.client
      .from("planned_item_occurrences")
      .select("*")
      .eq("household_id", householdId);

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async listOccurrenceDestinations(
    occurrenceIds: string[],
  ): Promise<RepoResult<PlannedItemOccurrenceDestinationRow[]>> {
    if (occurrenceIds.length === 0) return { data: [], error: null };

    const { data, error } = await this.client
      .from("planned_item_occurrence_destinations")
      .select("*")
      .in("occurrence_id", occurrenceIds);

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async listMatches(occurrenceIds: string[]): Promise<RepoResult<PlannedItemMatchRow[]>> {
    if (occurrenceIds.length === 0) return { data: [], error: null };

    const { data, error } = await this.client
      .from("planned_item_matches")
      .select("*")
      .in("occurrence_id", occurrenceIds);

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async getMonthlyBudgetPeriod(
    householdId: string,
    month: string,
  ): Promise<RepoResult<MonthlyBudgetPeriodRow | null>> {
    const { data, error } = await this.client
      .from("monthly_budget_periods")
      .select("*")
      .eq("household_id", householdId)
      .eq("month", month)
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: (data as MonthlyBudgetPeriodRow | null) ?? null, error: null };
  }

  // ------------------------------------------------------------
  // RPCs -- see supabase/migrations/20260901001800_planned_item_rpcs.sql.
  // ------------------------------------------------------------

  /** Upserts occurrences/occurrence-destinations for exactly the entries in `resolved` (the TS resolver's output) -- read-only for everything it wasn't told to touch. Returns the number of occurrences upserted. */
  async materializeOccurrences(
    householdId: string,
    month: string,
    resolved: Json,
  ): Promise<RepoResult<number>> {
    const { data, error } = await this.client.rpc("materialize_planned_item_occurrences", {
      p_household_id: householdId,
      p_month: month,
      p_resolved: resolved,
    });

    if (error) return { data: null, error };
    return { data: Number(data ?? 0), error: null };
  }

  async confirmMonth(
    householdId: string,
    month: string,
    transfers: Json,
    confirmedBy: string,
  ): Promise<RepoResult<MonthlyBudgetPeriodRow>> {
    const { data, error } = await this.client.rpc("confirm_planned_item_month", {
      p_household_id: householdId,
      p_month: month,
      p_transfers: transfers,
      p_confirmed_by: confirmedBy,
    });

    if (error) return { data: null, error };
    return { data: data as MonthlyBudgetPeriodRow, error: null };
  }

  async revertOccurrence(occurrenceId: string): Promise<RepoResult<PlannedItemOccurrenceRow>> {
    const { data, error } = await this.client.rpc("revert_planned_item_occurrence", {
      p_occurrence_id: occurrenceId,
    });

    if (error) return { data: null, error };
    return { data: data as PlannedItemOccurrenceRow, error: null };
  }

  /** Bulk version of revertOccurrence, for an entire month at once -- see
   * 20260901002200_revert_monthly_budget_month.sql. Deletes every
   * transaction confirm_planned_item_month generated for this
   * household+month, resets their occurrences back to 'planned', and
   * reopens the monthly_budget_periods row. Unlike revertOccurrence, this
   * works whether the month is 'committed' or 'closed' -- reopening it is
   * the whole point. */
  async revertMonth(householdId: string, month: string): Promise<RepoResult<MonthlyBudgetPeriodRow>> {
    const { data, error } = await this.client.rpc("revert_monthly_budget_month", {
      p_household_id: householdId,
      p_month: month,
    });

    if (error) return { data: null, error };
    return { data: data as MonthlyBudgetPeriodRow, error: null };
  }

  /**
   * Pays ONE occurrence directly -- creates its plain_expense transaction
   * and marks it 'confirmed' in a single RPC call, optionally at a
   * different actual amount than expected_amount (omit/undefined to pay
   * at the expected amount unchanged). See
   * 20260905000000_confirm_planned_item_occurrence.sql for the exact
   * scope (single-leg outflow occurrences only) and why this doesn't
   * duplicate confirm_planned_item_month or match_planned_item_occurrence.
   */
  async confirmOccurrence(
    occurrenceId: string,
    confirmedBy: string,
    actualAmount?: number,
  ): Promise<RepoResult<PlannedItemOccurrenceRow>> {
    const { data, error } = await this.client.rpc("confirm_planned_item_occurrence", {
      p_occurrence_id: occurrenceId,
      p_confirmed_by: confirmedBy,
      p_actual_amount: actualAmount ?? null,
    });

    if (error) return { data: null, error };
    return { data: data as PlannedItemOccurrenceRow, error: null };
  }

  async matchOccurrence(
    occurrenceId: string,
    transactionId: string,
    matchedBy: string,
  ): Promise<RepoResult<PlannedItemOccurrenceRow>> {
    const { data, error } = await this.client.rpc("match_planned_item_occurrence", {
      p_occurrence_id: occurrenceId,
      p_transaction_id: transactionId,
      p_matched_by: matchedBy,
    });

    if (error) return { data: null, error };
    return { data: data as PlannedItemOccurrenceRow, error: null };
  }

  async unmatchOccurrence(occurrenceId: string): Promise<RepoResult<PlannedItemOccurrenceRow>> {
    const { data, error } = await this.client.rpc("unmatch_planned_item_occurrence", {
      p_occurrence_id: occurrenceId,
    });

    if (error) return { data: null, error };
    return { data: data as PlannedItemOccurrenceRow, error: null };
  }

  /** "Unmark as paid, keep the transaction" for a 'confirmed' occurrence (one paid via confirmOccurrence/confirm_planned_item_month, not matched to a pre-existing transaction) -- see 20260906000000_unlink_planned_item_occurrence_transaction.sql. Detaches the generated transaction's planned-item lineage columns instead of deleting it (that's revertOccurrence's job), so the transaction survives as an ordinary transaction while the occurrence returns to 'planned'. */
  async unlinkOccurrenceTransaction(occurrenceId: string): Promise<RepoResult<PlannedItemOccurrenceRow>> {
    const { data, error } = await this.client.rpc("unlink_planned_item_occurrence_transaction", {
      p_occurrence_id: occurrenceId,
    });

    if (error) return { data: null, error };
    return { data: data as PlannedItemOccurrenceRow, error: null };
  }

  async skipOccurrence(occurrenceId: string): Promise<RepoResult<PlannedItemOccurrenceRow>> {
    const { data, error } = await this.client.rpc("skip_planned_item_occurrence", {
      p_occurrence_id: occurrenceId,
    });

    if (error) return { data: null, error };
    return { data: data as PlannedItemOccurrenceRow, error: null };
  }

  async cancelOccurrence(occurrenceId: string): Promise<RepoResult<PlannedItemOccurrenceRow>> {
    const { data, error } = await this.client.rpc("cancel_planned_item_occurrence", {
      p_occurrence_id: occurrenceId,
    });

    if (error) return { data: null, error };
    return { data: data as PlannedItemOccurrenceRow, error: null };
  }

  async resetOccurrenceToTemplate(occurrenceId: string): Promise<RepoResult<PlannedItemOccurrenceRow>> {
    const { data, error } = await this.client.rpc("reset_planned_item_occurrence_to_template", {
      p_occurrence_id: occurrenceId,
    });

    if (error) return { data: null, error };
    return { data: data as PlannedItemOccurrenceRow, error: null };
  }
}
