import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { savingPotsService } from '../services/saving-pots.service'
import { useAuth } from '@/providers/AuthProvider'

export function useSavingPots() {
  const { householdId, isLoading } = useAuth()

  return useQuery({
    queryKey: ['saving-pots', householdId],
    queryFn: () => savingPotsService.getSavingPots(householdId!),
    enabled: !!householdId && !isLoading,
  })
}

export function useSavingPotBalances() {
  const { householdId, isLoading } = useAuth()

  return useQuery({
    queryKey: ['saving-pot-balances', householdId],
    queryFn: () => savingPotsService.getBalances(householdId!),
    enabled: !!householdId && !isLoading,
  })
}

export function useCreateSavingPot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: savingPotsService.createSavingPot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saving-pots'] })
      queryClient.invalidateQueries({ queryKey: ['saving-pot-balances'] })
    },
  })
}

export function useDeleteSavingPot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: savingPotsService.deleteSavingPot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saving-pots'] })
      queryClient.invalidateQueries({ queryKey: ['saving-pot-balances'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
