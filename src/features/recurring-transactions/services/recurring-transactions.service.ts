import { repositories } from "@/repositories";
import type { Database } from "@/types/database.types";
import type { TransactionType } from "@/types/transaction-type";

type Frequency = Database["public"]["Enums"]["recurring_frequency"];
type RuleKind = Database["public"]["Enums"]["recurring_rule_kind"];
type ExpenseKind = Database["public"]["Enums"]["recurring_expense_kind"];
type EndCondition = Database["public"]["Enums"]["recurring_end_condition"];

/**
 * How a recurring rule stops generating movements. Mirrors the
 * `recurring_transactions_end_condition_shape` check constraint added in
 * `supabase/migrations/20260901000300_recurring_end_conditions.sql`:
 * exactly one of `endAfterOccurrences`/`endDate` is set, matching
 * `endCondition`. See docs/recurring-end-conditions-reimbursements-bug-fab-plan.md §1.
 */
export type RecurringEndConditionInput =
  | { endCondition: "never" }
  | { endCondition: "count"; endAfterOccurrences: number }
  | { endCondition: "date"; endDate: string };

export type CreateRecurringTransactionInput = {
  household_id: string;
  account_id: string;
  category_id?: string | null;
  pot_id?: string | null;
  rule_kind?: RuleKind;
  expense_kind?: ExpenseKind | null;
  destination_account_id?: string | null;
  destination_pot_id?: string | null;
  title: string;
  notes?: string | null;
  amount: number;
  type: TransactionType;
  frequency: Frequency;
  excluded_months?: number[] | null;
  next_run: string;
  created_by: string;
  endCondition?: RecurringEndConditionInput;
};

export type UpdateRecurringTransactionInput = {
  id: string;
  title?: string;
  notes?: string | null;
  amount?: number;
  type?: TransactionType;
  frequency?: Frequency;
  excluded_months?: number[] | null;
  next_run?: string;
  account_id?: string;
  category_id?: string | null;
  pot_id?: string | null;
  rule_kind?: RuleKind;
  expense_kind?: ExpenseKind | null;
  destination_account_id?: string | null;
  destination_pot_id?: string | null;
  created_by?: string;
  endCondition?: RecurringEndConditionInput;
};

/**
 * Translates the tagged-union `endCondition` input into the three flat
 * columns the database expects, validating the same shape the DB check
 * constraint enforces (fail fast client-side with a clear message instead
 * of surfacing a raw Postgres constraint-violation error).
 */
function resolveEndConditionColumns(input?: RecurringEndConditionInput): {
  end_condition: EndCondition;
  end_after_occurrences: number | null;
  end_date: string | null;
} {
  if (!input || input.endCondition === "never") {
    return { end_condition: "never", end_after_occurrences: null, end_date: null };
  }

  if (input.endCondition === "count") {
    if (!Number.isInteger(input.endAfterOccurrences) || input.endAfterOccurrences <= 0) {
      throw new Error(
        "endAfterOccurrences must be a positive integer when endCondition is 'count'.",
      );
    }
    return {
      end_condition: "count",
      end_after_occurrences: input.endAfterOccurrences,
      end_date: null,
    };
  }

  if (input.endCondition === "date") {
    if (!input.endDate) {
      throw new Error("endDate is required when endCondition is 'date'.");
    }
    return { end_condition: "date", end_after_occurrences: null, end_date: input.endDate };
  }

  // Exhaustiveness guard: TypeScript already narrows this to `never` for a
  // fully-typed caller, but the input crosses an untyped boundary (form
  // state, JSON) at runtime, so this stays a real check rather than relying
  // on the type system alone.
  throw new Error(`Unknown endCondition: ${(input as { endCondition: string }).endCondition}`);
}

class RecurringTransactionsService {
  async getRecurringTransactions(
    householdId: string,
    pagination?: { limit: number; offset: number },
  ) {
    const { data, error } =
      await repositories.recurringTransactions.listForHousehold(
        householdId,
        false,
        pagination,
      );

    if (error) throw error;

    return data ?? [];
  }

  async getExecutionHistory(recurringTransactionId: string) {
    const { data, error } =
      await repositories.recurringTransactions.listExecutions(
        recurringTransactionId,
      );

    if (error) throw error;

    return data ?? [];
  }

  async createRecurringTransaction(input: CreateRecurringTransactionInput) {
    const ruleKind = input.rule_kind ?? "transaction";
    const expenseKind =
      ruleKind === "transaction" && input.type === "expense"
        ? (input.expense_kind ?? "other")
        : null;
    const endConditionColumns = resolveEndConditionColumns(input.endCondition);
    const { data, error } = await repositories.recurringTransactions.create({
      ...input,
      rule_kind: ruleKind,
      expense_kind: expenseKind,
      destination_account_id: input.destination_account_id ?? null,
      destination_pot_id: input.destination_pot_id ?? null,
      // excluded_months is `not null default '{}'` -- unlike the other
      // nullable fields above, null isn't a valid value for it.
      excluded_months: input.excluded_months ?? undefined,
      ...endConditionColumns,
    });

    if (error) throw error;

    return data;
  }

  async updateRecurringTransaction(input: UpdateRecurringTransactionInput) {
    const { id, endCondition, ...data } = input;
    if (input.rule_kind === "transfer" || input.type === "income") {
      data.expense_kind = null;
    }
    const endConditionColumns = endCondition
      ? resolveEndConditionColumns(endCondition)
      : undefined;
    const { data: updated, error } =
      await repositories.recurringTransactions.update(id, {
        ...data,
        ...endConditionColumns,
      } as any);

    if (error) throw error;

    return updated;
  }

  async toggleRecurringTransaction(id: string, active: boolean) {
    const { data, error } = active
      ? await repositories.recurringTransactions.activate(id)
      : await repositories.recurringTransactions.deactivate(id);

    if (error) throw error;

    return data;
  }

  async deleteRecurringTransaction(id: string) {
    const { data, error } = await repositories.recurringTransactions.delete(id);

    if (error) throw error;

    return data;
  }
}

export const recurringTransactionsService = new RecurringTransactionsService();
export { resolveEndConditionColumns };
