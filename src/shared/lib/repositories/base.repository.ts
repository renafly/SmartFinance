import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'

/**
 * Table names that support full CRUD (Tables, not Views).
 */
export type TableName = keyof Database['public']['Tables']

type Row<T extends TableName> = Database['public']['Tables'][T]['Row']
type Insert<T extends TableName> = Database['public']['Tables'][T]['Insert']
type Update<T extends TableName> = Database['public']['Tables'][T]['Update']

/**
 * Discriminated-union result type so callers are forced to handle
 * the error case instead of accidentally using `data` when it's null.
 */
export type RepoResult<T> =
  | { data: T; error: null }
  | { data: null; error: PostgrestError | Error }

export interface ListOptions<T extends TableName> {
  /** Columns to select. Defaults to '*'. Use for joins, e.g. 'id, name, categories(name)' */
  select?: string
  /** Max rows to return */
  limit?: number
  /** Pagination offset */
  offset?: number
  /** Order by column */
  orderBy?: { column: keyof Row<T> & string; ascending?: boolean }
  /** Simple equality filters, applied as .eq(key, value) for each entry */
  filters?: Partial<Row<T>>
}

/**
 * Generic repository providing typed CRUD for a single Supabase table.
 * Extend this per-table when you need bespoke queries (joins, RPCs, views).
 */
export class BaseRepository<T extends TableName> {
  constructor(
    protected readonly client: SupabaseClient<Database>,
    protected readonly table: T
  ) {}

  async findById(id: string, select = '*'): Promise<RepoResult<Row<T>>> {
    const { data, error } = await this.client
      .from(this.table)
      .select(select)
      .eq('id' as any, id)
      .maybeSingle()

    if (error) return { data: null, error }
    if (!data) return { data: null, error: new Error(`${this.table} ${id} not found`) }
    return { data: data as unknown as Row<T>, error: null }
  }

  async list(options: ListOptions<T> = {}): Promise<RepoResult<Row<T>[]>> {
    let query = this.client.from(this.table).select(options.select ?? '*')

    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value !== undefined) {
          query = query.eq(key as any, value as any)
        }
      }
    }

    if (options.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      })
    }

    if (typeof options.limit === 'number') {
      const from = options.offset ?? 0
      const to = from + options.limit - 1
      query = query.range(from, to)
    }

    const { data, error } = await query

    if (error) return { data: null, error }
    return { data: (data ?? []) as unknown as Row<T>[], error: null }
  }

  async create(values: Insert<T>): Promise<RepoResult<Row<T>>> {
    const { data, error } = await this.client
      .from(this.table)
      .insert(values as any)
      .select()
      .single()

    if (error) return { data: null, error }
    return { data: data as unknown as Row<T>, error: null }
  }

  async createMany(values: Insert<T>[]): Promise<RepoResult<Row<T>[]>> {
    const { data, error } = await this.client
      .from(this.table)
      .insert(values as any)
      .select()

    if (error) return { data: null, error }
    return { data: (data ?? []) as unknown as Row<T>[], error: null }
  }

  async update(id: string, values: Update<T>): Promise<RepoResult<Row<T>>> {
    const { data, error } = await this.client
      .from(this.table)
      .update(values as any)
      .eq('id' as any, id)
      .select()
      .single()

    if (error) return { data: null, error }
    return { data: data as unknown as Row<T>, error: null }
  }

  async delete(id: string): Promise<RepoResult<null>> {
    const { error } = await this.client.from(this.table).delete().eq('id' as any, id)

    if (error) return { data: null, error }
    return { data: null, error: null }
  }
}