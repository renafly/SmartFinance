import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";

import { dashboardNetworkConfigService } from "../services/dashboard-network-config.service";
import type { DashboardNetworkConfig } from "../network-config";

function useDashboardNetworkConfigQueryKey() {
  const { profile } = useAuth();
  return ["dashboard-network-config", profile?.id] as const;
}

/** The saved network config for the current profile, or `undefined` while
 * loading, or `null` if the profile has never customized it (fall back to
 * `buildDefaultDashboardNetworkConfig` in that case). Profile-scoped (not
 * household-scoped) since this is a personal display preference -- see the
 * `dashboard_network_configs` migration. */
export function useDashboardNetworkConfigQuery() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["dashboard-network-config", profile?.id],
    queryFn: () => dashboardNetworkConfigService.get(profile!.id),
    enabled: !!profile?.id,
  });
}

/** Saves the profile's full network config (all four groups) and updates
 * the query cache directly from the server response, so the 3D network
 * recalculates immediately without waiting on a refetch round-trip. */
export function useSaveDashboardNetworkConfig() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useDashboardNetworkConfigQueryKey();

  return useMutation({
    mutationFn: (config: DashboardNetworkConfig) =>
      dashboardNetworkConfigService.save(profile!.id, config),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKey, saved);
    },
  });
}
