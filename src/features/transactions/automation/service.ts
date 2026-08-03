import { transactionAutomationRepository } from "@/repositories/transaction-automation.repository";
import { normalizeMerchantText } from "./normalization";
import { matchTransactionRule } from "./rules";
import { validateTransactionSplits } from "./splits";
import type {
  BulkTransactionChanges,
  TransactionRuleCandidate,
  TransactionSplitInput,
} from "./types";

export class TransactionAutomationService {
  async suggestFromRules(
    householdId: string,
    candidate: TransactionRuleCandidate,
  ) {
    const result =
      await transactionAutomationRepository.listActiveRules(householdId);
    if (result.error) throw result.error;
    return matchTransactionRule(candidate, result.data);
  }

  async bulkEdit(
    householdId: string,
    transactionIds: readonly string[],
    changes: BulkTransactionChanges,
  ) {
    const ids = [...new Set(transactionIds.filter(Boolean))];
    if (ids.length === 0) throw new Error("Select at least one transaction.");

    const update: {
      category_id?: string | null;
      merchant_name?: string | null;
    } = {};
    if ("categoryId" in changes) update.category_id = changes.categoryId;
    if ("merchantName" in changes) {
      update.merchant_name = changes.merchantName?.trim() || null;
    }
    if (Object.keys(update).length > 0) {
      const result =
        await transactionAutomationRepository.bulkUpdateTransactions(
          householdId,
          ids,
          update,
        );
      if (result.error) throw result.error;
    }
    if (changes.tagIds) {
      const result = await transactionAutomationRepository.replaceTags(
        householdId,
        ids,
        changes.tagIds,
      );
      if (result.error) throw result.error;
    }
    return ids.length;
  }

  async replaceSplits(
    householdId: string,
    transactionId: string,
    transactionAmount: number,
    splits: readonly TransactionSplitInput[],
  ) {
    validateTransactionSplits(transactionAmount, splits);
    const result = await transactionAutomationRepository.replaceSplits(
      householdId,
      transactionId,
      splits,
    );
    if (result.error) throw result.error;
    return result.data;
  }

  normalizeRulePattern(pattern: string) {
    const normalized = normalizeMerchantText(pattern);
    if (!normalized) throw new Error("Rule pattern cannot be empty.");
    return normalized;
  }
}

export const transactionAutomationService = new TransactionAutomationService();
