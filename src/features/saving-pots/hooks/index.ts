import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { savingPotsService } from '../services/saving-pots.service'
import { useSession } from '@/shared/session'

export function useSavingPots() {
  const { data: session, isPending: sessionLoading } = useSession()
  const householdId = session?.household.id

  return useQuery({
    queryKey: ['saving-pots', householdId],
    queryFn: () => savingPotsService.getSavingPots(householdId!),
    enabled: !!householdId && !sessionLoading,
  })
}

export function useSavingPotBalances() {
  const { data: session, isPending: sessionLoading } = useSession()
  const householdId = session?.household.id

  return useQuery({
    queryKey: ['saving-pot-balances', householdId],
    queryFn: () => savingPotsService.getBalances(householdId!),
    enabled: !!householdId && !sessionLoading,
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
