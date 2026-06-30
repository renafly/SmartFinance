import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsService } from '../services/accounts.service'

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: accountsService.deleteAccount,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['accounts'],
      })
    },
  })
}