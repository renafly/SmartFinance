import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsService } from '../services/accounts.service'

export function useArchiveAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: accountsService.archiveAccount,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['accounts'],
      })
    },
  })
}