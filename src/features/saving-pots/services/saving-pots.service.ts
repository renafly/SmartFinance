import { repositories } from '@/shared/lib/repositories'

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
  }) {
    const { data, error } = await repositories.savingPots.create(input as any)
    if (error) throw error
    return data
  }

  async deleteSavingPot(id: string) {
    const { data, error } = await repositories.savingPots.delete(id)
    if (error) throw error
    return data
  }
}

export const savingPotsService = new SavingPotsService()
