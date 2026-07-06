import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { AccountsRepository } from "./accounts.repository";
import { AttachmentsRepository } from "./attachments.repository";
import { CategoriesRepository } from "./categories.repository";
import { HouseholdsRepository } from "./households.repository";
import { ProfilesRepository } from "./profiles.repository";
import { RecurringTransactionsRepository } from "./recurring.transactions.repository";
import { SavingPotsRepository } from "./saving-pots.repository";
import { TransactionsRepository } from "./transactions.repository";

export * from "./accounts.repository";
export * from "./attachments.repository";
export * from "./base.repository";
export * from "./categories.repository";
export * from "./households.repository";
export * from "./profiles.repository";
export * from "./recurring.transactions.repository";
export * from "./saving-pots.repository";
export * from "./transactions.repository";

export function createRepositories(
  client: SupabaseClient<Database> = supabase,
) {
  return {
    accounts: new AccountsRepository(client),
    attachments: new AttachmentsRepository(client),
    categories: new CategoriesRepository(client),
    households: new HouseholdsRepository(client),
    profiles: new ProfilesRepository(client),
    recurringTransactions: new RecurringTransactionsRepository(client),
    savingPots: new SavingPotsRepository(client),
    transactions: new TransactionsRepository(client),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

/** Default singleton, wired to the app's shared supabase client. */
export const repositories = createRepositories();
