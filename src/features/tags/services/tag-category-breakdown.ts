import { roundMoney } from "@/features/planned-items/utils";

import type { TagTransaction } from "../types";

/**
 * Pure helper behind the Tags screen's "Spending by category" doughnut.
 *
 * Input is the per-tag transaction lists the screen already loads (one
 * list_transaction_tag_transactions result per visible tag, same queries the
 * expanded tag rows use). An expense carrying several tags appears in several
 * of those lists, so rows are deduplicated by transaction id -- the chart
 * shows real tagged spending, never the sum of overlapping tag totals.
 *
 * Amounts are `netAmount` (net of reimbursements), the same basis as the tag
 * totals in the list. Fully-reimbursed (<= 0) rows are left out of the chart.
 */

export type TagCategorySlice = {
  /** category id, "uncategorized", or "other" for the folded tail. */
  key: string;
  label: string;
  icon: string | null;
  value: number;
  transactionCount: number;
};

export type TagCategoryBreakdown = {
  total: number;
  transactionCount: number;
  slices: TagCategorySlice[];
};

export const UNCATEGORIZED_SLICE_KEY = "uncategorized";
export const OTHER_SLICE_KEY = "other";

export function buildTagCategoryBreakdown(
  transactionLists: readonly (readonly TagTransaction[] | undefined)[],
  options: { maxSlices: number; uncategorizedLabel: string; otherLabel: string },
): TagCategoryBreakdown {
  const seen = new Set<string>();
  const byCategory = new Map<string, TagCategorySlice>();

  for (const list of transactionLists) {
    for (const transaction of list ?? []) {
      if (seen.has(transaction.id)) continue;
      seen.add(transaction.id);
      if (!(transaction.netAmount > 0)) continue;

      const key = transaction.categoryId ?? UNCATEGORIZED_SLICE_KEY;
      const existing = byCategory.get(key);
      if (existing) {
        existing.value += transaction.netAmount;
        existing.transactionCount += 1;
      } else {
        byCategory.set(key, {
          key,
          label: transaction.categoryId
            ? (transaction.categoryName ?? options.uncategorizedLabel)
            : options.uncategorizedLabel,
          icon: transaction.categoryId ? transaction.categoryIcon : null,
          value: transaction.netAmount,
          transactionCount: 1,
        });
      }
    }
  }

  const sorted = [...byCategory.values()]
    .map((slice) => ({ ...slice, value: roundMoney(slice.value) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

  const maxSlices = Math.max(1, Math.floor(options.maxSlices));
  let slices = sorted;
  // Fold the tail into one "Other" slice, but only when that actually saves a
  // slice (folding a single category into "Other" would just hide its name).
  if (sorted.length > maxSlices) {
    const head = sorted.slice(0, maxSlices - 1);
    const tail = sorted.slice(maxSlices - 1);
    slices = [
      ...head,
      {
        key: OTHER_SLICE_KEY,
        label: options.otherLabel,
        icon: null,
        value: roundMoney(tail.reduce((sum, slice) => sum + slice.value, 0)),
        transactionCount: tail.reduce((sum, slice) => sum + slice.transactionCount, 0),
      },
    ];
  }

  return {
    total: roundMoney(sorted.reduce((sum, slice) => sum + slice.value, 0)),
    transactionCount: sorted.reduce((sum, slice) => sum + slice.transactionCount, 0),
    slices,
  };
}
