import { formatLocalDate } from "@/features/dashboard/utils";

import { getDescendantCategoryIds, type ExplorerNode, type ExplorerTree } from "./explorer-data";

// Data layer for the simple two-panel "category browser" alternative to the
// 3D explorer. Reuses the same ExplorerTree (buildCategoryExplorerTree) so
// both surfaces always agree on hierarchy/labels/icons/colors — only the
// spending stats below are specific to this view.

export type CategoryBrowserPeriod = "1m" | "3m" | "6m" | "1y" | "all";
export const CATEGORY_BROWSER_PERIOD_OPTIONS: CategoryBrowserPeriod[] = ["1m", "3m", "6m", "1y", "all"];
const PERIOD_MONTHS: Record<Exclude<CategoryBrowserPeriod, "all">, number> = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 };

// Same calendar-aligned convention as the dashboard's category spend network
// and Wage Flow presets: "3 months" = this month plus the two before it.
// "all" has no bound, so the caller fetches full history.
export function categoryBrowserPeriodRange(period: CategoryBrowserPeriod, now: Date): { from?: string; to?: string } {
  if (period === "all") return {};
  const months = PERIOD_MONTHS[period];
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: formatLocalDate(start), to: formatLocalDate(end) };
}

export type BrowserTransactionLike = {
  id: string;
  title: string;
  amount: number | string | null;
  type: string;
  transaction_date: string;
  category_id: string | null;
  account?: { id: string; name: string } | null;
  created_by_profile?: { id: string; full_name: string | null } | null;
};

export type CategoryBrowserChildStat = {
  id: string;
  label: string;
  icon: ExplorerNode["icon"];
  color: string;
  isArchived: boolean;
  total: number;
  count: number;
};

export type CategoryBrowserBreakdownEntry = {
  id: string;
  label: string;
  total: number;
  count: number;
};

export type CategoryBrowserRecentTransaction = {
  id: string;
  title: string;
  amount: number;
  type: string;
  transactionDate: string;
  accountName: string | null;
};

export type CategoryBrowserStats = {
  total: number;
  count: number;
  percentOfType: number; // 0..1, share of every transaction of this node's type (income/expense/account)
  typeTotal: number;
  subcategories: CategoryBrowserChildStat[];
  recentTransactions: CategoryBrowserRecentTransaction[];
  byAccount: CategoryBrowserBreakdownEntry[];
  byUser: CategoryBrowserBreakdownEntry[];
};

const RECENT_TRANSACTIONS_LIMIT = 8;

function sumAmount(rows: BrowserTransactionLike[]) {
  return rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
}

/** categoryId -> the set of ids that roll up into it (itself + every descendant category). */
function relevantCategoryIds(node: ExplorerNode, tree: ExplorerTree): Set<string> {
  const ids = new Set<string>();
  if (node.categoryId) ids.add(node.categoryId);
  getDescendantCategoryIds(tree, node.id).forEach((id) => {
    const descendant = tree.nodesById.get(id);
    if (descendant?.categoryId) ids.add(descendant.categoryId);
  });
  return ids;
}

// Computes everything the browser's right-hand detail panel shows for the
// selected node: rolled-up totals (self + every descendant category),
// immediate-child breakdown, recent activity, and per-account/per-user
// splits. `categoryTypeById` maps every category id to its type so the
// percent-of-type figure reflects the household's total for that type, not
// just what happens to be loaded in `transactions`.
export function computeCategoryBrowserStats(
  node: ExplorerNode,
  tree: ExplorerTree,
  transactions: BrowserTransactionLike[],
  categoryTypeById: Map<string, string>,
  sharedLabel: string,
): CategoryBrowserStats {
  const ids = relevantCategoryIds(node, tree);
  const nodeType = node.categoryType;

  const rows = transactions.filter((row) => row.category_id && ids.has(row.category_id));
  const typeRows = transactions.filter(
    (row) => row.category_id && categoryTypeById.get(row.category_id) === nodeType,
  );

  const total = sumAmount(rows);
  const typeTotal = sumAmount(typeRows);
  const percentOfType = typeTotal > 0 ? total / typeTotal : 0;

  const subcategories: CategoryBrowserChildStat[] = node.childIds
    .map((childId) => tree.nodesById.get(childId))
    .filter((child): child is ExplorerNode => !!child)
    .map((child) => {
      const childIds = relevantCategoryIds(child, tree);
      const childRows = transactions.filter((row) => row.category_id && childIds.has(row.category_id));
      return {
        id: child.id,
        label: child.label,
        icon: child.icon,
        color: child.color,
        isArchived: child.isArchived,
        total: sumAmount(childRows),
        count: childRows.length,
      };
    })
    .sort((a, b) => b.total - a.total);

  const recentTransactions: CategoryBrowserRecentTransaction[] = [...rows]
    .sort((a, b) => {
      const diff = new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
      return diff !== 0 ? diff : String(b.id).localeCompare(String(a.id));
    })
    .slice(0, RECENT_TRANSACTIONS_LIMIT)
    .map((row) => ({
      id: row.id,
      title: row.title,
      amount: Number(row.amount ?? 0),
      type: row.type,
      transactionDate: row.transaction_date,
      accountName: row.account?.name ?? null,
    }));

  const accountTotals = new Map<string, { label: string; total: number; count: number }>();
  const userTotals = new Map<string, { label: string; total: number; count: number }>();

  for (const row of rows) {
    const amount = Number(row.amount ?? 0);

    const accountKey = row.account?.id ?? "__unknown__";
    const accountLabel = row.account?.name ?? "—";
    const accountEntry = accountTotals.get(accountKey) ?? { label: accountLabel, total: 0, count: 0 };
    accountEntry.total += amount;
    accountEntry.count += 1;
    accountTotals.set(accountKey, accountEntry);

    const userKey = row.created_by_profile?.id ?? "__shared__";
    const userLabel = row.created_by_profile?.full_name?.trim() || sharedLabel;
    const userEntry = userTotals.get(userKey) ?? { label: userLabel, total: 0, count: 0 };
    userEntry.total += amount;
    userEntry.count += 1;
    userTotals.set(userKey, userEntry);
  }

  const byAccount = [...accountTotals.entries()]
    .map(([id, value]) => ({ id, label: value.label, total: value.total, count: value.count }))
    .sort((a, b) => b.total - a.total);
  const byUser = [...userTotals.entries()]
    .map(([id, value]) => ({ id, label: value.label, total: value.total, count: value.count }))
    .sort((a, b) => b.total - a.total);

  return { total, count: rows.length, percentOfType, typeTotal, subcategories, recentTransactions, byAccount, byUser };
}
