import { repositories } from "@/repositories";
import type { DashboardNetworkConfigRow } from "@/repositories/dashboard-network-config.repository";

import type { DashboardNetworkConfig } from "../network-config";

export function rowToDashboardNetworkConfig(
  row: DashboardNetworkConfigRow,
): DashboardNetworkConfig {
  return {
    accountIds: row.account_ids ?? [],
    investmentAccountIds: row.investment_account_ids ?? [],
    savingsAccountIds: row.savings_account_ids ?? [],
    potIds: row.pot_ids ?? [],
  };
}

export function dashboardNetworkConfigToRowValues(config: DashboardNetworkConfig) {
  return {
    account_ids: config.accountIds,
    investment_account_ids: config.investmentAccountIds,
    savings_account_ids: config.savingsAccountIds,
    pot_ids: config.potIds,
  };
}

class DashboardNetworkConfigService {
  /** `null` means the profile hasn't customized the network yet -- the
   * caller falls back to "everything selected" (see
   * `buildDefaultDashboardNetworkConfig`) rather than this service
   * inventing defaults from account/pot data it doesn't have. */
  async get(profileId: string): Promise<DashboardNetworkConfig | null> {
    const { data, error } = await repositories.dashboardNetworkConfig.getForProfile(profileId);
    if (error) throw error;
    return data ? rowToDashboardNetworkConfig(data) : null;
  }

  /** Upserts the profile's full config in one call -- callers always pass
   * the complete config (all four groups), not a partial patch, since a
   * single group edit is applied client-side onto the current effective
   * config before saving (see `useSaveDashboardNetworkConfig`). */
  async save(profileId: string, config: DashboardNetworkConfig): Promise<DashboardNetworkConfig> {
    const { data, error } = await repositories.dashboardNetworkConfig.upsertForProfile(
      profileId,
      dashboardNetworkConfigToRowValues(config),
    );
    if (error) throw error;
    return rowToDashboardNetworkConfig(data);
  }
}

export const dashboardNetworkConfigService = new DashboardNetworkConfigService();
