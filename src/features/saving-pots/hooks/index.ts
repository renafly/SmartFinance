import { useMutation, useQueryClient } from '@tanstack/react-query'
import { savingPotsService } from '../services/saving-pots.service'
import { invalidateHouseholdData } from '@/lib/query-invalidation'

export {
  useSavingPotAccountAssignments,
  useSavingPotBalances,
  useSavingPots,
} from './useSavingPotQueries'

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

export { useSavingPotForecasts } from "./useSavingPotForecasts";
