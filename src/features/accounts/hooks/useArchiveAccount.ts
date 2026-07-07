import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsService } from '../services/accounts.service'
import { invalidateHouseholdData } from '@/lib/query-invalidation'

export function useArchiveAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: accountsService.archiveAccount,

    onSuccess: () => {
      invalidateHouseholdData(queryClient)
    },
  })
}
