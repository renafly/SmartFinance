import type { Database } from '@/shared/types/database.types'

export type Account = Database['public']['Tables']['accounts']['Row']
export type NewAccount =
  Database['public']['Tables']['accounts']['Insert']
export type UpdateAccount =
  Database['public']['Tables']['accounts']['Update']

export type CreateAccountDTO = Pick<
  NewAccount,
  'household_id' | 'name' | 'type' | 'currency' | 'initial_balance'
>

export type UpdateAccountDTO = Pick<
  UpdateAccount,
  'name' | 'type' | 'currency' | 'icon' | 'color'
>