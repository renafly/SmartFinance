import { repositories } from "@/repositories";
import type { SaveTransactionAllocationInput } from "@/repositories/transaction-allocations.repository";
import {
  allocationsToRpcPayload,
  validateAllocations,
  type AllocationDraft,
} from "@/features/transactions/utils/transaction-allocations";

/**
 * The one write path for a transaction's funding-source breakdown. Called
 * by the create/edit transaction form today; deliberately generic (plain
 * data in, no UI concerns) so any future process -- a recurring-transaction
 * run, the monthly budget engine, or a not-yet-built reconciliation/
 * "reposição" flow -- can drive allocations the same way. See
 * docs/split-transactions-plan.md §1 ("On the new replenishment system")
 * and §7 (phase 5).
 */
class TransactionAllocationsService {
  async getForTransaction(transactionId: string) {
    const { data, error } =
      await repositories.transactionAllocations.listForTransaction(transactionId);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Replaces a transaction's funding-source allocations so they sum to
   * `totalAmount`. Pass `allocations: []` to convert a split transaction
   * back to a single (non-split) source.
   *
   * Ordering contract for callers that are also changing the transaction's
   * own `amount` in the same user action: update the transaction's amount
   * first, then call `replace` with `totalAmount` set to that *new* amount.
   * The two writes are separate round-trips (this table's RLS/RPC design
   * intentionally does not require a client-side transaction wrapper), so
   * there is a brief window where `transactions.amount` and the
   * still-stored allocations disagree -- exactly like this codebase's
   * existing create-transaction-then-upload-attachment flow. The server
   * only ever validates a *new* allocations write against the amount as it
   * stands at that moment, so calling `replace` second always restores
   * consistency; if `replace` itself fails, the caller should surface the
   * error and let the user retry saving the split (the transaction's core
   * fields already saved successfully).
   */
  async replace(
    transactionId: string,
    totalAmount: number,
    allocations: readonly AllocationDraft[],
  ) {
    if (allocations.length > 0) {
      const errors = validateAllocations(totalAmount, allocations);
      if (errors.length > 0) {
        throw new Error(`Invalid split allocations: ${errors.join(", ")}`);
      }
    }

    const payload: SaveTransactionAllocationInput[] = allocationsToRpcPayload(allocations);
    const { error } = await repositories.transactionAllocations.save(transactionId, payload);
    if (error) throw error;
  }
}

export const transactionAllocationsService = new TransactionAllocationsService();
