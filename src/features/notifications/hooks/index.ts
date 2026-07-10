import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "../services/notifications.service";
import { useAuth } from "@/providers/AuthProvider";

export function useNotifications() {
  const { profile, isLoading } = useAuth();
  return useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: () => notificationsService.listForCurrentUser(),
    enabled: Boolean(profile?.id) && !isLoading,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
