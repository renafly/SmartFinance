import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import { supabase } from '@/shared/lib/supabase/client'

import { AccountsRepository } from './accounts.repository'
import { AttachmentsRepository } from './attachments.repository'
import { BudgetsRepository } from './budgets.repository'
import { CategoriesRepository } from './categories.repository'
import { HouseholdsRepository } from './households.repository'
import { ProfilesRepository } from './profiles.repository'
import { RecurringTransactionsRepository } from './recurring.transactions.repository'
import { TransactionsRepository } from './transactions.repository'

export * from './base.repository'
export * from './accounts.repository'
export * from './attachments.repository'
export * from './budgets.repository'
export * from './categories.repository'
export * from './households.repository'
export * from './profiles.repository'
export * from './recurring.transactions.repository'
export * from './transactions.repository'

/**
 * Bundles every repository against one Supabase client. Build with the
 * shared `supabase` client by default, or pass a different client
 * (e.g. a service-role client on the server) if needed.
 */
export function createRepositories(client: SupabaseClient<Database> = supabase) {
  return {
    accounts: new AccountsRepository(client),
    attachments: new AttachmentsRepository(client),
    budgets: new BudgetsRepository(client),
    categories: new CategoriesRepository(client),
    households: new HouseholdsRepository(client),
    profiles: new ProfilesRepository(client),
    recurringTransactions: new RecurringTransactionsRepository(client),
    transactions: new TransactionsRepository(client),
  }
}

export type Repositories = ReturnType<typeof createRepositories>

/** Default singleton, wired to the app's shared supabase client. */
export const repositories = createRepositories()
