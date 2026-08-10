import { repositories } from "@/repositories";
import type { Database } from "@/types/database.types";

type Frequency = Database["public"]["Enums"]["recurring_frequency"];
type TransactionType = Database["public"]["Enums"]["transaction_type"];
type RuleKind = Database["public"]["Enums"]["recurring_rule_kind"];
type ExpenseKind = Database["public"]["Enums"]["recurring_expense_kind"];

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
};

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
    const { data, error } = await repositories.recurringTransactions.create({
      ...input,
      rule_kind: ruleKind,
      expense_kind: expenseKind,
      destination_account_id: input.destination_account_id ?? null,
      destination_pot_id: input.destination_pot_id ?? null,
    });

    if (error) throw error;

    return data;
  }

  async updateRecurringTransaction(input: UpdateRecurringTransactionInput) {
    const { id, ...data } = input;
    if (input.rule_kind === "transfer" || input.type === "income") {
      data.expense_kind = null;
    }
    const { data: updated, error } =
      await repositories.recurringTransactions.update(id, data as any);

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
