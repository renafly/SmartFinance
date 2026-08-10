import type { Ionicons } from "@expo/vector-icons";

export type CategoryNetworkNode = {
  id: string;
  parentId: string | null;
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

// Same accent-rotation idea as the accounts network (network-data.ts under
// dashboard) — every sub-category inherits its main category's color so the
// graph reads as branches of the same tree instead of unrelated dots.
export function buildCategoryAccentPalette(colors: {
  primary: string;
  financialPositive: string;
  financialNeutral: string;
  financialGoal: string;
  financialAttention: string;
  info: string;
  warning: string;
  destructive: string;
}) {
  return [
    colors.primary,
    colors.financialAttention,
    colors.financialNeutral,
    colors.financialGoal,
    colors.financialPositive,
    colors.info,
    colors.warning,
    colors.destructive,
  ];
}

type CategoryLike = {
  id: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
  type: string;
  is_archived?: boolean;
};

// Only "expense" categories carry a meaningful spend figure, so the
// network only ever visualizes those.
export function buildCategoryNetworkNodes(
  categories: CategoryLike[],
  spendByCategoryId: Map<string, number>,
  accentPalette: string[],
): CategoryNetworkNode[] {
  const expenseCategories = categories.filter(
    (category) => category.type === "expense" && !category.is_archived,
  );
  const mainCategories = expenseCategories.filter((category) => !category.parent_id);

  return expenseCategories.map((category) => {
    const isMain = !category.parent_id;
    const mainIndex = isMain
      ? mainCategories.findIndex((main) => main.id === category.id)
      : mainCategories.findIndex((main) => main.id === category.parent_id);
    const color = accentPalette[Math.max(0, mainIndex) % accentPalette.length];

    return {
      id: category.id,
      parentId: category.parent_id,
      label: category.name,
      value: spendByCategoryId.get(category.id) ?? 0,
      color,
      icon: (category.icon as keyof typeof Ionicons.glyphMap | null) ?? (isMain ? "pricetag-outline" : "ellipse-outline"),
    };
  });
}

export type CategorySpendNode = {
  id: string;
  label: string;
  value: number;
  count: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  perUser: { id: string; label: string; value: number }[];
};

type SpendTransactionLike = {
  category_id: string | null;
  amount: number | string | null;
  type: string;
  created_by?: string | null;
  transfer_group_id?: string | null;
};

type MemberLike = {
  fullName?: string | null;
  email?: string | null;
};

// Powers the dashboard's category spend network (category-spend-graph-scene
// + category-spend-sidebar) — one node per main expense category (own spend
// + every subcategory's spend rolled up, same aggregation as the main hubs
// in the 2D category network), with a transaction count and a
// per-household-member breakdown of who did that spending (the latter isn't
// surfaced in the current sidebar+graph view, but stays computed here in
// case a future detail view wants it).
export function buildCategorySpendNetworkNodes(
  categories: CategoryLike[],
  transactions: SpendTransactionLike[],
  memberMap: Map<string, MemberLike>,
  accentPalette: string[],
  sharedLabel: string,
  unnamedLabel: string,
): CategorySpendNode[] {
  const mainCategories = categories.filter(
    (category) => category.type === "expense" && !category.parent_id && !category.is_archived,
  );
  const childIdsByMain = new Map<string, Set<string>>();
  for (const category of categories) {
    if (category.type !== "expense" || !category.parent_id || category.is_archived) continue;
    const set = childIdsByMain.get(category.parent_id) ?? new Set<string>();
    set.add(category.id);
    childIdsByMain.set(category.parent_id, set);
  }

  const expenseRows = transactions.filter(
    (transaction) => transaction.type === "expense" && !transaction.transfer_group_id && transaction.category_id,
  );

  return mainCategories
    .map((main, index) => {
      const relevantIds = new Set([main.id, ...(childIdsByMain.get(main.id) ?? [])]);
      const rows = expenseRows.filter((transaction) => relevantIds.has(transaction.category_id as string));
      const value = rows.reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);

      const perUserTotals = new Map<string, number>();
      for (const row of rows) {
        const key = row.created_by ?? "__shared__";
        perUserTotals.set(key, (perUserTotals.get(key) ?? 0) + Number(row.amount ?? 0));
      }

      const perUser = [...perUserTotals.entries()]
        .map(([userId, total]) => ({
          id: userId,
          label:
            userId === "__shared__"
              ? sharedLabel
              : memberMap.get(userId)?.fullName?.trim() || memberMap.get(userId)?.email?.trim() || unnamedLabel,
          value: total,
        }))
        .sort((a, b) => b.value - a.value);

      return {
        id: main.id,
        label: main.name,
        value,
        count: rows.length,
        color: accentPalette[index % accentPalette.length],
        icon: (main.icon as keyof typeof Ionicons.glyphMap | null) ?? "pricetag-outline",
        perUser,
      };
    })
    .filter((node) => node.value !== 0);
}
