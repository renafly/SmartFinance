import { repositories } from "@/shared/lib/repositories";

type BudgetPeriod = "weekly" | "monthly" | "yearly";

class BudgetsService {
  async getBudgets(householdId: string, period?: BudgetPeriod) {
    const { data, error } = await repositories.budgets.listForHousehold(householdId, period as any);

    if (error) throw error;

    return data ?? [];
  }

  async getProgress(householdId: string) {
    const { data, error } = await repositories.budgets.listProgress(householdId);

    if (error) throw error;

    return data ?? [];
  }

  async createBudget(input: {
    household_id: string;
    category_id: string;
    amount: number;
    period: BudgetPeriod;
    start_date: string;
    end_date: string;
    created_by: string;
  }) {
    const { data, error } = await repositories.budgets.create(input as any);

    if (error) throw error;

    return data;
  }

  async deleteBudget(id: string) {
    const { data, error } = await repositories.budgets.delete(id);

    if (error) throw error;

    return data;
  }
}

export const budgetsService = new BudgetsService();