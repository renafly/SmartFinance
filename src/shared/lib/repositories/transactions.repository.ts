import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import { BaseRepository, type RepoResult } from '@/shared/lib/repositories/base.repository'

type Transaction = Database['public']['Tables']['transactions']['Row']
type TransactionType = Database['public']['Enums']['transaction_type']
type MonthlySummary = Database['public']['Views']['monthly_summary']['Row']
type MonthlyCategorySpending = Database['public']['Views']['monthly_category_spending']['Row']

export interface TransactionFilters {
  accountId?: string
  categoryId?: string
  type?: TransactionType
  /** ISO date string, inclusive lower bound on transaction_date */
  from?: string
  /** ISO date string, inclusive upper bound on transaction_date */
  to?: string
  limit?: number
  offset?: number
}

export interface CreateTransferInput {
  householdId: string
  fromAccountId: string
  toAccountId: string
  amount: number
  title: string
  notes?: string
  transactionDate?: string
  createdBy: string
}

export class TransactionsRepository extends BaseRepository<'transactions'> {
  constructor(client: SupabaseClient<Database>) {
    super(client, 'transactions')
  }

  async listForHousehold(
    householdId: string,
    filters: TransactionFilters = {}
  ): Promise<RepoResult<Transaction[]>> {
    let query = this.client
      .from('transactions')
      .select('*')
      .eq('household_id', householdId)
      .order('transaction_date', { ascending: false })

    if (filters.accountId) query = query.eq('account_id', filters.accountId)
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.from) query = query.gte('transaction_date', filters.from)
    if (filters.to) query = query.lte('transaction_date', filters.to)

    if (typeof filters.limit === 'number') {
      const from = filters.offset ?? 0
      const to = from + filters.limit - 1
      query = query.range(from, to)
    }

    const { data, error } = await query
    if (error) return { data: null, error }
    return { data: data ?? [], error: null }
  }

  /**
   * Creates a paired transfer (expense from one account, income to another)
   * via the create_transfer RPC. Returns the transfer_group_id linking the
   * two generated transaction rows.
   */
  async createTransfer(input: CreateTransferInput): Promise<RepoResult<string>> {
    const { data, error } = await this.client.rpc('create_transfer', {
      p_household_id: input.householdId,
      p_from_account_id: input.fromAccountId,
      p_to_account_id: input.toAccountId,
      p_amount: input.amount,
      p_title: input.title,
      p_notes: input.notes ?? '',
      p_transaction_date: input.transactionDate ?? new Date().toISOString(),
      p_created_by: input.createdBy,
    })

    if (error) return { data: null, error }
    return { data: data as string, error: null }
  }

  /** All rows sharing a transfer_group_id (the two legs of a transfer). */
  async listByTransferGroup(transferGroupId: string): Promise<RepoResult<Transaction[]>> {
    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .eq('transfer_group_id', transferGroupId)

    if (error) return { data: null, error }
    return { data: data ?? [], error: null }
  }

  async listMonthlySummary(householdId: string): Promise<RepoResult<MonthlySummary[]>> {
    const { data, error } = await this.client
      .from('monthly_summary')
      .select('*')
      .eq('household_id', householdId)
      .order('month', { ascending: false })

    if (error) return { data: null, error }
    return { data: data ?? [], error: null }
  }

  async listMonthlyCategorySpending(
    householdId: string,
    month?: string
  ): Promise<RepoResult<MonthlyCategorySpending[]>> {
    let query = this.client
      .from('monthly_category_spending')
      .select('*')
      .eq('household_id', householdId)
      .order('month', { ascending: false })

    if (month) query = query.eq('month', month)

    const { data, error } = await query
    if (error) return { data: null, error }
    return { data: data ?? [], error: null }
  }
}
