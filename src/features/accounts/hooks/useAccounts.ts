import { useQuery } from '@tanstack/react-query'

import { accountsService } from '../services/accounts.service'
import { useAuth } from '@/providers/AuthProvider'

export function useAccounts() {
  const { householdId, isLoading } = useAuth()

  return useQuery({
    queryKey: ['accounts', householdId],
    queryFn: () => accountsService.getAccounts(householdId!),
    enabled: !!householdId && !isLoading,
  })
}
export function useAccount(id: string) {
  return useQuery({
    queryKey: ["accounts", id],
    queryFn: () => accountsService.getAccountById(id),
    enabled: !!id,
  });
}
