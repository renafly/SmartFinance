import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsService } from '../services/accounts.service'
import { invalidateHouseholdData } from '@/lib/query-invalidation'

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: accountsService.deleteAccount,

    onSuccess: () => {
      invalidateHouseholdData(queryClient)
    },
  })
}
