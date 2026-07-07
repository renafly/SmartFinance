import { repositories } from '@/repositories'

class SavingPotsService {
  async getSavingPots(householdId: string) {
    const { data, error } = await repositories.savingPots.listForHousehold(householdId)
    if (error) throw error
    return data ?? []
  }

  async getBalances(householdId: string) {
    const { data, error } = await repositories.savingPots.listBalances(householdId)
    if (error) throw error
    return data ?? []
  }

  async createSavingPot(input: {
    household_id: string
    name: string
    target_amount?: number | null
    color?: string | null
    icon?: string | null
    created_by: string
    selected_account_ids?: string[]
  }) {
    const { selected_account_ids: selectedAccountIds = [], ...potInput } = input
    const { data, error } = await repositories.savingPots.create(potInput as any)
    if (error) throw error

    if (data && selectedAccountIds.length > 0) {
      const selectionResult = await repositories.savingPots.setAccountAssignments(
        data.id,
        selectedAccountIds,
      )

      if (selectionResult.error) throw selectionResult.error
    }

    return data
  }

  async getAccountAssignments() {
    const { data, error } = await repositories.savingPots.listAccountAssignments()
    if (error) throw error
    return data ?? []
  }

  async setAccountAssignments(potId: string, accountIds: string[]) {
    const { data, error } = await repositories.savingPots.setAccountAssignments(potId, accountIds)
    if (error) throw error
    return data
  }

  async updateSavingPot(input: {
    id: string
    name?: string
    target_amount?: number | null
  }) {
    const { id, ...data } = input
    const { data: updated, error } = await repositories.savingPots.update(id, data as any)
    if (error) throw error
    return updated
  }

  async deleteSavingPot(id: string) {
    const { data, error } = await repositories.savingPots.delete(id)
    if (error) throw error
    return data
  }
}

export const savingPotsService = new SavingPotsService()

