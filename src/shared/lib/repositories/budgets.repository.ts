import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import { BaseRepository, type RepoResult } from '@/shared/lib/repositories/base.repository'

type Budget = Database['public']['Tables']['budgets']['Row']
type BudgetProgress = Database['public']['Views']['budget_progress']['Row']
type BudgetPeriod = Database['public']['Enums']['budget_period']

export class BudgetsRepository extends BaseRepository<'budgets'> {
  constructor(client: SupabaseClient<Database>) {
    super(client, 'budgets')
  }

  async listForHousehold(
    householdId: string,
    period?: BudgetPeriod
  ): Promise<RepoResult<Budget[]>> {
    let query = this.client
      .from('budgets')
      .select('*')
      .eq('household_id', householdId)
      .order('start_date', { ascending: false })

    if (period) query = query.eq('period', period)

    const { data, error } = await query
    if (error) return { data: null, error }
    return { data: data ?? [], error: null }
  }

  async listForCategory(categoryId: string): Promise<RepoResult<Budget[]>> {
    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('category_id', categoryId)
      .order('start_date', { ascending: false })

    if (error) return { data: null, error }
    return { data: data ?? [], error: null }
  }

  /** Reads the budget_progress view: spent/remaining per budget for the household. */
  async listProgress(householdId: string): Promise<RepoResult<BudgetProgress[]>> {
    const { data, error } = await this.client
      .from('budget_progress')
      .select('*')
      .eq('household_id', householdId)

    if (error) return { data: null, error }
    return { data: data ?? [], error: null }
  }

  /** Budgets active on a given date (start_date <= date <= end_date). */
  async listActiveOn(householdId: string, date: string): Promise<RepoResult<Budget[]>> {
    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('household_id', householdId)
      .lte('start_date', date)
      .gte('end_date', date)

    if (error) return { data: null, error }
    return { data: data ?? [], error: null }
  }
}
