import { replenishmentsRepository } from "@/repositories/replenishments.repository";
import type { CreateDraftRunInput, ConfirmReplenishmentRunInput } from "@/repositories/replenishments.repository";
import type { ReplenishmentRunDetail } from "../types";

class ReplenishmentService {
  async saveDraft(input: CreateDraftRunInput, existingRunId?: string | null) {
    const { data, error } = await replenishmentsRepository.saveDraft(input, existingRunId);
    if (error) throw error;
    return data;
  }

  async confirmRun(input: ConfirmReplenishmentRunInput) {
    const { data, error } = await replenishmentsRepository.confirmRun(input);
    if (error) throw error;
    return data;
  }

  async deleteDraft(runId: string) {
    const { error } = await replenishmentsRepository.deleteDraft(runId);
    if (error) throw error;
  }

  async listRuns(householdId: string) {
    const { data, error } = await replenishmentsRepository.listForHousehold(householdId);
    if (error) throw error;
    return data ?? [];
  }

  async getRunDetail(runId: string): Promise<ReplenishmentRunDetail> {
    const { data, error } = await replenishmentsRepository.getDetail(runId);
    if (error) throw error;

    // Two transfer legs (expense + income) share transfer_group_id -- pair
    // them back up into a single displayable transfer row for the detail
    // view, mirroring how list_transaction_movements collapses transfer
    // pairs for the main Transactions list.
    const legsByGroup = new Map<
      string,
      { account_id: string; amount: number; type: string; account: { id: string; name: string } | null }[]
    >();
    for (const leg of data.transferLegs ?? []) {
      const key = leg.transfer_group_id as string;
      const existing = legsByGroup.get(key) ?? [];
      existing.push(leg as any);
      legsByGroup.set(key, existing);
    }

    const transfers = [...legsByGroup.entries()]
      .map(([transferGroupId, legs]) => {
        const outgoing = legs.find((leg) => leg.type === "expense");
        const incoming = legs.find((leg) => leg.type === "income");
        if (!outgoing || !incoming) return null;
        return {
          transferGroupId,
          sourceAccountId: outgoing.account_id,
          sourceAccountName: outgoing.account?.name ?? outgoing.account_id,
          destinationAccountId: incoming.account_id,
          destinationAccountName: incoming.account?.name ?? incoming.account_id,
          amount: outgoing.amount,
        };
      })
      .filter((transfer): transfer is NonNullable<typeof transfer> => transfer !== null);

    return {
      ...(data as any),
      transactions: data.transactions ?? [],
      sources: data.sources ?? [],
      transfers,
    };
  }
}

export const replenishmentService = new ReplenishmentService();
