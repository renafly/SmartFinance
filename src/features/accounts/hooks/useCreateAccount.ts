import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsService } from '../services/accounts.service'

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: accountsService.createAccount,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['accounts'],
      })
    },
  })
}