import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/providers/AuthProvider';

import { savingPotsService } from '../services/saving-pots.service';

export function useSavingPots() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ['saving-pots', householdId],
    queryFn: () => savingPotsService.getSavingPots(householdId!),
    enabled: !!householdId && !isLoading,
  });
}

export function useSavingPotBalances() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ['saving-pot-balances', householdId],
    queryFn: () => savingPotsService.getBalances(householdId!),
    enabled: !!householdId && !isLoading,
  });
}

export function useSavingPotAccountAssignments() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ['saving-pot-accounts', householdId],
    queryFn: () => savingPotsService.getAccountAssignments(),
    enabled: !!householdId && !isLoading,
  });
}
