import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsService } from '../services/accounts.service'

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: accountsService.updateAccount,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['accounts'],
      })
    },
  })
}