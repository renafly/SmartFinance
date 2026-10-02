import { repositories } from "@/repositories";
import type { TagDateRange } from "@/repositories/transaction-tags.repository";

import type { TagNameError, TagSummary, TagTransaction, TransactionTag } from "../types";
import {
  normalizeTagName,
  rowToTagSummary,
  rowToTagTransaction,
  rowToTransactionTag,
  validateTagName,
} from "./tag-view-model";

/**
 * Thrown for a tag name that fails validation -- `code` is an i18n key
 * suffix under `tags.errors.*`, so callers can show a localized message
 * instead of a raw database error.
 */
export class TagNameValidationError extends Error {
  constructor(public readonly code: TagNameError) {
    super(`Invalid tag name: ${code}`);
    this.name = "TagNameValidationError";
  }
}

function isUniqueViolation(error: unknown) {
  return !!error && typeof error === "object" && (error as { code?: string }).code === "23505";
}

class TagsService {
  async listTags(householdId: string): Promise<TransactionTag[]> {
    const { data, error } = await repositories.transactionTags.listForHousehold(householdId);
    if (error) throw error;
    return (data ?? []).map(rowToTransactionTag);
  }

  async getSummaries(householdId: string, range: TagDateRange = {}): Promise<TagSummary[]> {
    const { data, error } = await repositories.transactionTags.summarize(householdId, range);
    if (error) throw error;
    return (data ?? []).map(rowToTagSummary);
  }

  async getTagTransactions(
    householdId: string,
    tagId: string,
    range: TagDateRange = {},
  ): Promise<TagTransaction[]> {
    const { data, error } = await repositories.transactionTags.listTagTransactions(householdId, tagId, range);
    if (error) throw error;
    return (data ?? []).map(rowToTagTransaction);
  }

  async getTransactionTagIds(transactionId: string): Promise<string[]> {
    const { data, error } = await repositories.transactionTags.listTagIdsForTransaction(transactionId);
    if (error) throw error;
    return data ?? [];
  }

  async createTag(
    input: { name: string },
    context: { householdId: string; createdBy: string; existing: readonly { id: string; name: string }[] },
  ): Promise<TransactionTag> {
    const name = normalizeTagName(input.name);
    const validation = validateTagName(name, context.existing);
    if (validation) throw new TagNameValidationError(validation);

    const { data, error } = await repositories.transactionTags.create({
      household_id: context.householdId,
      created_by: context.createdBy,
      name,
    });
    if (error) {
      // Another member created the same name concurrently.
      if (isUniqueViolation(error)) throw new TagNameValidationError("duplicate");
      throw error;
    }
    return rowToTransactionTag(data);
  }

  /** Renaming updates the single tag row, so every tagged transaction reflects it immediately. */
  async renameTag(
    input: { id: string; name: string },
    context: { existing: readonly { id: string; name: string }[] },
  ): Promise<TransactionTag> {
    const name = normalizeTagName(input.name);
    const validation = validateTagName(name, context.existing, input.id);
    if (validation) throw new TagNameValidationError(validation);

    const { data, error } = await repositories.transactionTags.update(input.id, { name });
    if (error) {
      if (isUniqueViolation(error)) throw new TagNameValidationError("duplicate");
      throw error;
    }
    return rowToTransactionTag(data);
  }

  /** Deletes the tag and (via ON DELETE CASCADE) only its assignment rows -- never a transaction. */
  async deleteTag(id: string): Promise<void> {
    const { error } = await repositories.transactionTags.delete(id);
    if (error) throw error;
  }

  async setTransactionTags(transactionId: string, tagIds: readonly string[]): Promise<number> {
    const { data, error } = await repositories.transactionTags.setTransactionTags(transactionId, tagIds);
    if (error) throw error;
    return data ?? 0;
  }
}

export const tagsService = new TagsService();
