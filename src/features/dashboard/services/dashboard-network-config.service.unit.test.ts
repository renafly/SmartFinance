import {
  dashboardNetworkConfigToRowValues,
  rowToDashboardNetworkConfig,
} from "./dashboard-network-config.service";
import type { DashboardNetworkConfigRow } from "@/repositories/dashboard-network-config.repository";
import type { DashboardNetworkConfig } from "../network-config";

describe("rowToDashboardNetworkConfig", () => {
  it("maps snake_case row columns to the camelCase config shape", () => {
    const row: DashboardNetworkConfigRow = {
      id: "row-1",
      profile_id: "profile-1",
      account_ids: ["a1", "a2"],
      investment_account_ids: ["i1"],
      savings_account_ids: ["s1"],
      pot_ids: ["p1", "p2"],
      created_at: "2026-08-15T00:00:00Z",
      updated_at: "2026-08-15T00:00:00Z",
    };

    expect(rowToDashboardNetworkConfig(row)).toEqual<DashboardNetworkConfig>({
      accountIds: ["a1", "a2"],
      investmentAccountIds: ["i1"],
      savingsAccountIds: ["s1"],
      potIds: ["p1", "p2"],
    });
  });

  it("defaults a null array column to an empty array rather than throwing", () => {
    const row = {
      id: "row-1",
      profile_id: "profile-1",
      account_ids: null,
      investment_account_ids: null,
      savings_account_ids: null,
      pot_ids: null,
      created_at: "2026-08-15T00:00:00Z",
      updated_at: "2026-08-15T00:00:00Z",
    } as unknown as DashboardNetworkConfigRow;

    expect(rowToDashboardNetworkConfig(row)).toEqual<DashboardNetworkConfig>({
      accountIds: [],
      investmentAccountIds: [],
      savingsAccountIds: [],
      potIds: [],
    });
  });
});

describe("dashboardNetworkConfigToRowValues", () => {
  it("maps the camelCase config shape back to snake_case row columns", () => {
    const config: DashboardNetworkConfig = {
      accountIds: ["a1"],
      investmentAccountIds: ["i1", "i2"],
      savingsAccountIds: [],
      potIds: ["p1"],
    };

    expect(dashboardNetworkConfigToRowValues(config)).toEqual({
      account_ids: ["a1"],
      investment_account_ids: ["i1", "i2"],
      savings_account_ids: [],
      pot_ids: ["p1"],
    });
  });

  it("round-trips through rowToDashboardNetworkConfig unchanged", () => {
    const config: DashboardNetworkConfig = {
      accountIds: ["a1", "a2"],
      investmentAccountIds: ["i1"],
      savingsAccountIds: ["s1", "s2"],
      potIds: [],
    };

    const row = {
      id: "row-1",
      profile_id: "profile-1",
      ...dashboardNetworkConfigToRowValues(config),
      created_at: "2026-08-15T00:00:00Z",
      updated_at: "2026-08-15T00:00:00Z",
    } as DashboardNetworkConfigRow;

    expect(rowToDashboardNetworkConfig(row)).toEqual(config);
  });
});
