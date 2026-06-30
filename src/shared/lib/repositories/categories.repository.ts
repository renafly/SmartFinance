import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import { BaseRepository, type RepoResult } from '@/shared/lib/repositories/base.repository'

type Category = Database['public']['Tables']['categories']['Row']
type TransactionType = Database['public']['Enums']['transaction_type']

export class CategoriesRepository extends BaseRepository<'categories'> {
  constructor(client: SupabaseClient<Database>) {
    super(client, 'categories')
  }

  async listForHousehold(
    householdId: string,
    type?: TransactionType
  ): Promise<RepoResult<Category[]>> {
    let query = this.client
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order', { ascending: true })

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    if (error) return { data: null, error }
    return { data: data ?? [], error: null }
  }

  /** Top-level categories only (parent_id is null). */
  async listTopLevel(
    householdId: string,
    type?: TransactionType
  ): Promise<RepoResult<Category[]>> {
    let query = this.client
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .is('parent_id', null)
      .order('sort_order', { ascending: true })

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    if (error) return { data: null, error }
    return { data: data ?? [], error: null }
  }

  /** Direct children of a given category. */
  async listChildren(parentId: string): Promise<RepoResult<Category[]>> {
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .eq('parent_id', parentId)
      .order('sort_order', { ascending: true })

    if (error) return { data: null, error }
    return { data: data ?? [], error: null }
  }
}
