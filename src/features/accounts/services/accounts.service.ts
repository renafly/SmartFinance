import { accountsRepository } from '@/repositories/accounts.repository'
import type { CreateAccountDTO, UpdateAccountDTO } from '@/features/accounts/types'

type CreateAccountInput = CreateAccountDTO

type UpdateAccountInput = {
  id: string
  data: UpdateAccountDTO
}

type AccountIdInput = {
  id: string
}

export class AccountsService {
  async getAccounts(householdId: string) {
    const result = await accountsRepository.listForHousehold(householdId)

    if (result.error) throw result.error

    return result.data
  }

  async getAccountById(id: string) {
    const { data, error } = await accountsRepository.findById(id)

    if (error) throw error;

    return data;
  }

  async getAccountsWithBalances(householdId: string) {
    const result = await accountsRepository.listWithBalances(householdId)

    if (result.error) throw result.error

    return result.data
  }

  async createAccount(data: CreateAccountInput) {
    if (!data.name.trim()) {
      throw new Error('Account name is required.')
    }

    if (data.initial_balance !== undefined && data.initial_balance < 0) {
      throw new Error('Initial balance cannot be negative.')
    }

    const result = await accountsRepository.create(data)

    if (result.error) throw result.error

    return result.data
  }

  async updateAccount({ id, data }: UpdateAccountInput) {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Account name is required.')
    }

    const result = await accountsRepository.update(id, data)

    if (result.error) throw result.error

    return result.data
  }

  async archiveAccount({ id }: AccountIdInput) {
    const result = await accountsRepository.archive(id)

    if (result.error) throw result.error

    return result.data
  }

  async unarchiveAccount({ id }: AccountIdInput) {
    const result = await accountsRepository.unarchive(id)

    if (result.error) throw result.error

    return result.data
  }

  async deleteAccount(id: string) {
    const result = await accountsRepository.delete(id)

    if (result.error) throw result.error

    return result.data
  }
}

export const accountsService = new AccountsService()
