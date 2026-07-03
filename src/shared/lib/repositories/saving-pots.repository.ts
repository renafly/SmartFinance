import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import { BaseRepository, type RepoResult } from '@/shared/lib/repositories/base.repository'

export type SavingPot = {
  id: string
  household_id: string
  name: string
  target_amount: number | null
  color: string | null
  icon: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type SavingPotBalance = {
  id: string
  household_id: string
  name: string
  target_amount: number | null
  color: string | null
  icon: string | null
  saved: number
  spent: number
  balance: number
}

export class SavingPotsRepository extends BaseRepository<'saving_pots'> {
  constructor(client: SupabaseClient<Database>) {
    super(client, 'saving_pots')
  }

  async listForHousehold(householdId: string): Promise<RepoResult<SavingPot[]>> {
    const { data, error } = await this.client
      .from('saving_pots')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })

    if (error) return { data: null, error }
    return { data: (data ?? []) as unknown as SavingPot[], error: null }
  }

  async listBalances(householdId: string): Promise<RepoResult<SavingPotBalance[]>> {
    const { data, error } = await this.client
      .from('saving_pot_balances')
      .select('*')
      .eq('household_id', householdId)

    if (error) return { data: null, error }
    return { data: (data ?? []) as unknown as SavingPotBalance[], error: null }
  }
}
