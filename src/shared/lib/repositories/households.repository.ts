import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import { BaseRepository, type RepoResult } from '@/shared/lib/repositories/base.repository'

type Household = Database['public']['Tables']['households']['Row']
type HouseholdMember = Database['public']['Tables']['household_members']['Row']
type HouseholdInvitation = Database['public']['Tables']['household_invitations']['Row']
type HouseholdRole = Database['public']['Enums']['household_role']

export type MyHouseholdInvitation = {
  id: string
  household_id: string
  household_name: string
  email: string
  role: HouseholdRole
  token: string
  expires_at: string | null
  created_at: string | null
}

export class HouseholdsRepository extends BaseRepository<'households'> {
  constructor(client: SupabaseClient<Database>) {
    super(client, 'households')
  }

  async createHousehold(name: string): Promise<RepoResult<Household>> {
    const { data, error } = await (this.client.rpc as any)('create_household', {
      p_name: name,
    })

    if (error) return { data: null, error }

    const household = (Array.isArray(data) ? data[0] : data) as Household | undefined

    if (!household) {
      return { data: null, error: new Error('Household creation did not return a household.') }
    }

    return { data: household, error: null }
  }

  /** All households the given user belongs to (owner or member), via household_members. */
  async listForUser(userId: string): Promise<RepoResult<Household[]>> {
    const { data, error } = await this.client
      .from('household_members')
      .select('household:households(*)')
      .eq('user_id', userId)
      .eq('status', 'accepted')

    if (error) return { data: null, error }
    const households = (data ?? [])
      .map((row) => (row as unknown as { household: Household | null }).household)
      .filter((h): h is Household => h !== null)
    return { data: households, error: null }
  }

  /** Members of a household, joined with profile info. */
  async listMembers(householdId: string): Promise<RepoResult<HouseholdMember[]>> {
    const { data, error } = await this.client
      .from('household_members')
      .select('*, profile:profiles!household_members_user_id_fkey(*)')
      .eq('household_id', householdId)

    if (error) return { data: null, error }
    return { data: data as unknown as HouseholdMember[], error: null }
  }
  
  async addMember(
    householdId: string,
    userId: string,
    role: HouseholdRole,
    status: 'pending' | 'accepted' = 'pending'
  ): Promise<RepoResult<HouseholdMember>> {
    const { data, error } = await this.client
      .from('household_members')
      .insert({ household_id: householdId, user_id: userId, role, status })
      .select()
      .single()

    if (error) return { data: null, error }
    return { data, error: null }
  }

  async removeMember(householdId: string, userId: string): Promise<RepoResult<null>> {
    const { error } = await this.client
      .from('household_members')
      .delete()
      .eq('household_id', householdId)
      .eq('user_id', userId)

    if (error) return { data: null, error }
    return { data: null, error: null }
  }

  async createInvitation(
    invite: Database['public']['Tables']['household_invitations']['Insert']
  ): Promise<RepoResult<HouseholdInvitation>> {
    const { data, error } = await this.client
      .from('household_invitations')
      .insert(invite)
      .select()
      .single()

    if (error) return { data: null, error }
    return { data, error: null }
  }

  async listInvitations(householdId: string): Promise<RepoResult<HouseholdInvitation[]>> {
    const { data, error } = await this.client
      .from('household_invitations')
      .select('*')
      .eq('household_id', householdId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })

    if (error) return { data: null, error }
    return { data: data ?? [], error: null }
  }

  async deleteInvitation(invitationId: string): Promise<RepoResult<null>> {
    const { error } = await this.client
      .from('household_invitations')
      .delete()
      .eq('id', invitationId)

    if (error) return { data: null, error }
    return { data: null, error: null }
  }

  async acceptInvitation(token: string): Promise<RepoResult<HouseholdInvitation>> {
    const { data, error } = await this.client
      .from('household_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', token)
      .select()
      .single()

    if (error) return { data: null, error }
    return { data, error: null }
  }

  async listMyInvitations(): Promise<RepoResult<MyHouseholdInvitation[]>> {
    const { data, error } = await (this.client as unknown as {
      rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: any }>
    }).rpc('list_my_household_invitations')

    if (error) return { data: null, error }
    return { data: (data ?? []) as unknown as MyHouseholdInvitation[], error: null }
  }

  async acceptInvitationByToken(token: string): Promise<RepoResult<{ household_id: string; role: HouseholdRole }>> {
    const { data, error } = await (this.client as unknown as {
      rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: any }>
    }).rpc('accept_household_invitation', {
      p_token: token,
    })

    if (error) return { data: null, error }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { household_id?: string; role?: HouseholdRole; out_household_id?: string; out_role?: HouseholdRole }
      | undefined

    if (!row) {
      return { data: null, error: new Error('Invitation response did not return a household.') }
    }

    const householdId = row.household_id ?? row.out_household_id
    const role = row.role ?? row.out_role

    if (!householdId || !role) {
      return { data: null, error: new Error('Invitation response payload is incomplete.') }
    }

    return {
      data: {
        household_id: householdId,
        role,
      },
      error: null,
    }
  }

  async declineInvitationByToken(token: string): Promise<RepoResult<boolean>> {
    const { data, error } = await (this.client as unknown as {
      rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: any }>
    }).rpc('decline_household_invitation', {
      p_token: token,
    })

    if (error) return { data: null, error }
    return { data: Boolean(data), error: null }
  }

  /** Wraps the is_household_member RPC. */
  async isMember(householdId: string, userId: string): Promise<RepoResult<boolean>> {
    const { data, error } = await this.client.rpc('is_household_member', {
      p_household_id: householdId,
      p_user_id: userId,
    })

    if (error) return { data: null, error }
    return { data: data ?? false, error: null }
  }

  /** Wraps the is_household_admin RPC. */
  async isAdmin(householdId: string, userId: string): Promise<RepoResult<boolean>> {
    const { data, error } = await this.client.rpc('is_household_admin', {
      p_household_id: householdId,
      p_user_id: userId,
    })

    if (error) return { data: null, error }
    return { data: data ?? false, error: null }
  }

  /** Wraps the is_household_owner RPC. */
  async isOwner(householdId: string, userId: string): Promise<RepoResult<boolean>> {
    const { data, error } = await this.client.rpc('is_household_owner', {
      p_household_id: householdId,
      p_user_id: userId,
    })

    if (error) return { data: null, error }
    return { data: data ?? false, error: null }
  }

  /** Seeds default categories + accounts for a newly created household. */
  async seedDefaults(householdId: string): Promise<RepoResult<null>> {
    const { error: catError } = await this.client.rpc('create_default_categories', {
      p_household_id: householdId,
    })
    if (catError) return { data: null, error: catError }

    const { error: acctError } = await this.client.rpc('create_default_accounts', {
      p_household_id: householdId,
    })
    if (acctError) return { data: null, error: acctError }

    return { data: null, error: null }
  }

  /** Transfer household ownership to another member. */
  async transferOwnership(
    householdId: string,
    newOwnerId: string
  ): Promise<RepoResult<{ success: boolean; message: string }>> {
    const { data, error } = await (this.client.rpc as any)('transfer_household_ownership', {
      p_household_id: householdId,
      p_new_owner_id: newOwnerId,
    })

    if (error) return { data: null, error }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { success?: boolean; message?: string }
      | undefined

    if (!row || typeof row.success !== 'boolean' || !row.message) {
      return { data: null, error: new Error('Invalid RPC response for transfer ownership.') }
    }

    return { data: { success: row.success, message: row.message }, error: null }
  }

  /** Remove a household member. */
  async removeMemberByRpc(householdId: string, userIdToRemove: string): Promise<RepoResult<{ success: boolean; message: string }>> {
    const { data, error } = await (this.client.rpc as any)('remove_household_member', {
      p_household_id: householdId,
      p_user_id_to_remove: userIdToRemove,
    })

    if (error) return { data: null, error }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { success?: boolean; message?: string }
      | undefined

    if (!row || typeof row.success !== 'boolean' || !row.message) {
      return { data: null, error: new Error('Invalid RPC response for remove member.') }
    }

    return { data: { success: row.success, message: row.message }, error: null }
  }

  /** Leave a household. */
  async leaveHousehold(householdId: string): Promise<RepoResult<{ success: boolean; message: string }>> {
    const { data, error } = await (this.client.rpc as any)('leave_household', {
      p_household_id: householdId,
    })

    if (error) return { data: null, error }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { success?: boolean; message?: string }
      | undefined

    if (!row || typeof row.success !== 'boolean' || !row.message) {
      return { data: null, error: new Error('Invalid RPC response for leave household.') }
    }

    return { data: { success: row.success, message: row.message }, error: null }
  }
}
