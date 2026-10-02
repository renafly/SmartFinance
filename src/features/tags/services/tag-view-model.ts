import { roundMoney } from "@/features/planned-items/utils";
import type {
  TransactionTagRow,
  TransactionTagSummaryRow,
  TransactionTagTransactionRow,
} from "@/repositories/transaction-tags.repository";

import {
  TAG_NAME_MAX_LENGTH,
  type TagNameError,
  type TagPeriodMode,
  type TagPeriodRange,
  type TagSortKey,
  type TagSummary,
  type TagTransaction,
  type TransactionTag,
} from "../types";

/**
 * Pure (network-free) helpers for the Tags feature -- mapping RPC rows,
 * sorting/filtering, period resolution, and name validation. Kept out of
 * the service/hooks so they're unit-testable in isolation, same split as
 * category-budget-view-model.ts.
 */

// PostgREST can serialize numeric as a string; coerce defensively.
function toMoney(value: unknown): number {
  return roundMoney(Number(value ?? 0));
}

export function rowToTransactionTag(row: TransactionTagRow): TransactionTag {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    color: row.color,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToTagSummary(row: TransactionTagSummaryRow): TagSummary {
  return {
    id: row.tag_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    transactionCount: Number(row.transaction_count ?? 0),
    grossTotal: toMoney(row.gross_total),
    reimbursedTotal: toMoney(row.reimbursed_total),
    netTotal: toMoney(row.net_total),
    lastTransactionDate: row.last_transaction_date ?? null,
  };
}

export function rowToTagTransaction(row: TransactionTagTransactionRow): TagTransaction {
  return {
    id: row.transaction_id,
    date: row.transaction_date,
    title: row.title,
    notes: row.notes,
    amount: toMoney(row.amount),
    reimbursedTotal: toMoney(row.reimbursed_total),
    netAmount: toMoney(row.net_amount),
    isSplit: !!row.is_split,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    accountId: row.account_id,
    accountName: row.account_name,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
  };
}

/** Trims and collapses internal whitespace ("  Travel   to Bali " -> "Travel to Bali"). */
export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** Case-insensitive comparison key, mirroring the DB's lower(btrim(name)) unique index. */
export function tagNameKey(name: string): string {
  return normalizeTagName(name).toLocaleLowerCase();
}

export function validateTagName(
  name: string,
  existing: readonly { id: string; name: string }[],
  excludeId?: string | null,
): TagNameError | null {
  const normalized = normalizeTagName(name);
  if (!normalized) return "required";
  if (normalized.length > TAG_NAME_MAX_LENGTH) return "tooLong";
  const key = tagNameKey(normalized);
  if (existing.some((tag) => tag.id !== excludeId && tagNameKey(tag.name) === key)) {
    return "duplicate";
  }
  return null;
}

/** Case/accent-insensitive "contains" match on the tag name. */
export function matchesTagQuery(name: string, query: string): boolean {
  const fold = (value: string) =>
    value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase().trim();
  const needle = fold(query);
  return !needle || fold(name).includes(needle);
}

export function filterTags<T extends { name: string }>(tags: readonly T[], query: string): T[] {
  return tags.filter((tag) => matchesTagQuery(tag.name, query));
}

function compareNames(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function sortTagSummaries(tags: readonly TagSummary[], sortKey: TagSortKey): TagSummary[] {
  const sorted = [...tags];
  sorted.sort((a, b) => {
    switch (sortKey) {
      case "spending":
        return b.netTotal - a.netTotal || compareNames(a, b);
      case "count":
        return b.transactionCount - a.transactionCount || compareNames(a, b);
      case "recent":
        return b.createdAt.localeCompare(a.createdAt) || compareNames(a, b);
      case "name":
      default:
        return compareNames(a, b);
    }
  });
  return sorted;
}

/** Last day of a "YYYY-MM" month as "YYYY-MM-DD". */
function lastDayOfMonth(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const day = new Date(year, monthIndex, 0).getDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turns the Tags screen's period controls into inclusive "YYYY-MM-DD"
 * bounds for the RPCs. Invalid/partial custom dates are ignored (treated
 * as an open bound) rather than sent to the server.
 */
export function resolveTagPeriodRange(
  mode: TagPeriodMode,
  month: string,
  customFrom: string,
  customTo: string,
): TagPeriodRange {
  if (mode === "month") {
    const normalized = month.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(normalized)) return { from: null, to: null };
    return { from: `${normalized}-01`, to: lastDayOfMonth(normalized) };
  }
  if (mode === "custom") {
    return {
      from: DATE_PATTERN.test(customFrom) ? customFrom : null,
      to: DATE_PATTERN.test(customTo) ? customTo : null,
    };
  }
  return { from: null, to: null };
}
