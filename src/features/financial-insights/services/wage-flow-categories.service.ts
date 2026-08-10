import { repositories } from "@/repositories";
import type {
  WageFlowCategoryInsert,
  WageFlowCategoryRow,
  WageFlowCategoryUpdate,
} from "@/repositories/wage-flow-categories.repository";

import type { WageFlowCategoryConfig } from "../wage-flow";

function rowToConfig(row: WageFlowCategoryRow): WageFlowCategoryConfig {
  return {
    id: row.id,
    name: row.name,
    colorToken: row.color,
    icon: row.icon,
    includeAllTransactions: row.include_all_transactions,
    accountIds: row.account_ids ?? [],
    categoryIds: row.category_ids ?? [],
    potAccountIds: row.pot_account_ids ?? [],
    includeTransfersBetweenAccounts: row.include_transfers_between_accounts,
    includeTransfersIntoPots: row.include_transfers_into_pots,
  };
}

function configToRow(
  householdId: string,
  config: WageFlowCategoryConfig,
  sortOrder: number,
): WageFlowCategoryInsert {
  return {
    household_id: householdId,
    name: config.name,
    color: config.colorToken,
    icon: config.icon,
    include_all_transactions: config.includeAllTransactions,
    account_ids: config.accountIds,
    category_ids: config.categoryIds,
    pot_account_ids: config.potAccountIds,
    include_transfers_between_accounts: config.includeTransfersBetweenAccounts,
    include_transfers_into_pots: config.includeTransfersIntoPots,
    sort_order: sortOrder,
  };
}

function configToUpdate(config: WageFlowCategoryConfig): WageFlowCategoryUpdate {
  return {
    name: config.name,
    color: config.colorToken,
    icon: config.icon,
    include_all_transactions: config.includeAllTransactions,
    account_ids: config.accountIds,
    category_ids: config.categoryIds,
    pot_account_ids: config.potAccountIds,
    include_transfers_between_accounts: config.includeTransfersBetweenAccounts,
    include_transfers_into_pots: config.includeTransfersIntoPots,
  };
}

class WageFlowCategoriesService {
  async list(householdId: string): Promise<WageFlowCategoryConfig[]> {
    const { data, error } = await repositories.wageFlowCategories.listForHousehold(householdId);
    if (error) throw error;
    return (data ?? []).map(rowToConfig);
  }

  /** Inserts the given configs as the household's initial set, in order.
   * Used once, the first time a household opens Wage Flow with no
   * categories saved yet. */
  async seedDefaults(
    householdId: string,
    defaults: WageFlowCategoryConfig[],
  ): Promise<WageFlowCategoryConfig[]> {
    return this.createMany(householdId, defaults, 0);
  }

  /** Inserts several new configs at once (e.g. the "Add all main
   * categories" bulk action), appending them after `startingSortOrder` in
   * the order given -- also the first-match-wins matching precedence. */
  async createMany(
    householdId: string,
    configs: WageFlowCategoryConfig[],
    startingSortOrder: number,
  ): Promise<WageFlowCategoryConfig[]> {
    if (configs.length === 0) return [];
    const rows = configs.map((config, index) =>
      configToRow(householdId, config, startingSortOrder + index),
    );
    const { data, error } = await repositories.wageFlowCategories.createMany(rows);
    if (error) throw error;
    return (data ?? []).map(rowToConfig);
  }

  async create(
    householdId: string,
    config: WageFlowCategoryConfig,
    sortOrder: number,
  ): Promise<WageFlowCategoryConfig> {
    const { data, error } = await repositories.wageFlowCategories.create(
      configToRow(householdId, config, sortOrder),
    );
    if (error) throw error;
    return rowToConfig(data);
  }

  async update(id: string, config: WageFlowCategoryConfig): Promise<WageFlowCategoryConfig> {
    const { data, error } = await repositories.wageFlowCategories.update(
      id,
      configToUpdate(config),
    );
    if (error) throw error;
    return rowToConfig(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await repositories.wageFlowCategories.delete(id);
    if (error) throw error;
  }

  async reorder(householdId: string, orderedIds: string[]): Promise<void> {
    const { error } = await repositories.wageFlowCategories.reorder(householdId, orderedIds);
    if (error) throw error;
  }
}

export const wageFlowCategoriesService = new WageFlowCategoriesService();
