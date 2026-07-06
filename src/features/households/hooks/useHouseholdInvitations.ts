import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { householdsService } from "@/features/households/services/households.service";
import { useAuth } from "@/providers/AuthProvider";
import type { Database } from "@/types/database.types";

type HouseholdRole = Database["public"]["Enums"]["household_role"];

export function useHouseholdInvitations() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["household-invitations", householdId],
    queryFn: () => householdsService.getInvitations(householdId!),
    enabled: !!householdId && !isLoading,
  });
}

export function useCreateHouseholdInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      householdId,
      email,
      role,
    }: {
      householdId: string;
      email: string;
      role: HouseholdRole;
    }) => householdsService.createInvitation({ householdId, email, role }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-invitations"] });
    },
  });
}

export function useRevokeHouseholdInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      householdsService.revokeInvitation(invitationId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-invitations"] });
    },
  });
}

export function useMyHouseholdInvitations() {
  const { profile, isLoading } = useAuth();

  return useQuery({
    queryKey: ["my-household-invitations", profile?.id],
    queryFn: () => householdsService.getMyInvitations(),
    enabled: !!profile?.id && !isLoading,
  });
}

export function useAcceptHouseholdInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => householdsService.acceptMyInvitation(token),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-household-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

export function useDeclineHouseholdInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => householdsService.declineMyInvitation(token),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-household-invitations"] });
    },
  });
}

