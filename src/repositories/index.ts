import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { AccountsRepository } from "./accounts.repository";
import { AttachmentsRepository } from "./attachments.repository";
import { CategoryBudgetsRepository } from "./category-budgets.repository";
import { CategoriesRepository } from "./categories.repository";
import { DashboardNetworkConfigRepository } from "./dashboard-network-config.repository";
import { HouseholdsRepository } from "./households.repository";
import { PlannedItemsRepository } from "./planned-items.repository";
import { ProfilesRepository } from "./profiles.repository";
import { RecurringExpensesRepository } from "./recurring-expenses.repository";
import { IncomeSourcesRepository } from "./income-sources.repository";
import { RecurringTransactionsRepository } from "./recurring.transactions.repository";
import { ReplenishmentsRepository } from "./replenishments.repository";
import { SavingPotsRepository } from "./saving-pots.repository";
import { TransactionsRepository } from "./transactions.repository";
import { TransactionAllocationsRepository } from "./transaction-allocations.repository";
import { TransactionAutomationRepository } from "./transaction-automation.repository";
import { TransactionReimbursementsRepository } from "./transaction-reimbursements.repository";
import { WageFlowCategoriesRepository } from "./wage-flow-categories.repository";

export * from "./accounts.repository";
export * from "./attachments.repository";
export * from "./category-budgets.repository";
export * from "./base.repository";
export * from "./categories.repository";
export * from "./dashboard-network-config.repository";
export * from "./households.repository";
export * from "./planned-items.repository";
export * from "./profiles.repository";
export * from "./recurring-expenses.repository";
export * from "./recurring.transactions.repository";
export * from "./replenishments.repository";
export * from "./saving-pots.repository";
export * from "./transactions.repository";
export * from "./transaction-allocations.repository";
export * from "./transaction-automation.repository";
export * from "./transaction-reimbursements.repository";
export * from "./wage-flow-categories.repository";

export function createRepositories(
  client: SupabaseClient<Database> = supabase,
) {
  return {
    accounts: new AccountsRepository(client),
    attachments: new AttachmentsRepository(client),
    categoryBudgets: new CategoryBudgetsRepository(client),
    categories: new CategoriesRepository(client),
    dashboardNetworkConfig: new DashboardNetworkConfigRepository(client),
    households: new HouseholdsRepository(client),
    plannedItems: new PlannedItemsRepository(client),
    profiles: new ProfilesRepository(client),
    recurringExpenses: new RecurringExpensesRepository(client),
    incomeSources: new IncomeSourcesRepository(client),
    recurringTransactions: new RecurringTransactionsRepository(client),
    replenishments: new ReplenishmentsRepository(client),
    savingPots: new SavingPotsRepository(client),
    transactions: new TransactionsRepository(client),
    transactionAllocations: new TransactionAllocationsRepository(client),
    transactionAutomation: new TransactionAutomationRepository(client),
    transactionReimbursements: new TransactionReimbursementsRepository(client),
    wageFlowCategories: new WageFlowCategoriesRepository(client),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

/** Default singleton, wired to the app's shared supabase client. */
export const repositories = createRepositories();
