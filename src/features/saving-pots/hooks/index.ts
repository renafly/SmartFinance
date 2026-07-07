import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { savingPotsService } from '../services/saving-pots.service'
import { useAuth } from '@/providers/AuthProvider'
import { invalidateHouseholdData } from '@/lib/query-invalidation'

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

export function useSavingPotAccountAssignments() {
  const { householdId, isLoading } = useAuth()

  return useQuery({
    queryKey: ['saving-pot-accounts', householdId],
    queryFn: () => savingPotsService.getAccountAssignments(),
    enabled: !!householdId && !isLoading,
  })
}

export function useCreateSavingPot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: savingPotsService.createSavingPot,
    onSuccess: () => {
      invalidateHouseholdData(queryClient)
    },
  })
}

export function useUpdateSavingPotAccounts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ potId, accountIds }: { potId: string; accountIds: string[] }) =>
      savingPotsService.setAccountAssignments(potId, accountIds),
    onSuccess: () => {
      invalidateHouseholdData(queryClient)
    },
  })
}

export function useUpdateSavingPot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: savingPotsService.updateSavingPot,
    onSuccess: () => {
      invalidateHouseholdData(queryClient)
    },
  })
}

export function useDeleteSavingPot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: savingPotsService.deleteSavingPot,
    onSuccess: () => {
      invalidateHouseholdData(queryClient)
    },
  })
}
