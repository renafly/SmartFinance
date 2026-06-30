import { useQuery } from '@tanstack/react-query'

import { accountsService } from '../services/accounts.service'
import { useSession } from '@/shared/session'

export function useAccounts() {
  const { data: session, isPending: sessionLoading } = useSession()

  const householdId = session?.household.id

  return useQuery({
    queryKey: ['accounts', householdId],
    queryFn: () => accountsService.getAccounts(householdId!),
    enabled: !!householdId && !sessionLoading,
  })
}
export function useAccount(id: string) {
  return useQuery({
    queryKey: ["accounts", id],
    queryFn: () => accountsService.getAccountById(id),
    enabled: !!id,
  });
}