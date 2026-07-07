import { repositories } from "@/repositories";

type Frequency = "daily" | "weekly" | "monthly" | "yearly" | "custom";
type TransactionType = "income" | "expense";

class RecurringTransactionsService {
  async getRecurringTransactions(householdId: string) {
    const { data, error } = await repositories.recurringTransactions.listForHousehold(householdId, false);

    if (error) throw error;

    return data ?? [];
  }

  async createRecurringTransaction(input: {
    household_id: string;
    account_id: string;
    category_id?: string | null;
    title: string;
    notes?: string | null;
    amount: number;
    type: TransactionType;
    frequency: Frequency;
    excluded_months?: number[] | null;
    next_run: string;
    created_by: string;
  }) {
    const { data, error } = await repositories.recurringTransactions.create(input as any);

    if (error) throw error;

    return data;
  }

  async updateRecurringTransaction(input: {
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
    created_by?: string;
  }) {
    const { id, ...data } = input;
    const { data: updated, error } = await repositories.recurringTransactions.update(id, data as any);

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
