import { useMemo, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/data-surface";
import { Pill, formatCurrency } from "@/components/migrated-page";
import { useTheme } from "@/theme/ThemeProvider";
import { typography } from "@/theme/typography";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import { useAllTransactions } from "@/features/transactions/hooks/useTransactions";
import { formatLocalDate } from "@/features/dashboard/utils";

import { CategorySpendGraphCanvas } from "./category-spend-graph-canvas";
import { CategorySpendSidebar } from "./category-spend-sidebar";
import { buildCategorySpendNetworkNodes } from "../network-data";

type CategoryLike = {
  id: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
  type: string;
  is_archived?: boolean;
};

type MemberLike = { fullName?: string | null; email?: string | null };

type CategorySpendNetworkSectionProps = {
  categories: CategoryLike[];
  memberMap: Map<string, MemberLike>;
  accentPalette: string[];
  sharedLabel: string;
  unnamedLabel: string;
};

type Period = "1m" | "3m" | "6m" | "1y";
const PERIOD_OPTIONS: Period[] = ["1m", "3m", "6m", "1y"];
const PERIOD_MONTHS: Record<Period, number> = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 };

// Calendar-aligned window ending on the current month, going back N-1 more
// full months — same convention as the Wage Flow period preset
// (financial-insights/date-range.ts's computeDateRange helper), so "3
// months" means "this month plus the two before it", not a rolling 90-day
// window.
function periodDateRange(period: Period, now: Date) {
  const months = PERIOD_MONTHS[period];
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: formatLocalDate(start), to: formatLocalDate(end) };
}

// Two-column dashboard version of the categories page's 3D explorer — a
// sidebar list and the gradient-disc sphere graph (see
// gradient-orb-node.tsx), with no third detail-panel column since there's
// nothing here to edit. Restricted to expense categories with a
// transaction count + total.
//
// Owns its own period selector and transaction fetch (via useAllTransactions,
// which pages through results so a full year of data isn't silently
// truncated) so every total shown is computed fresh from real transactions
// for the selected window — nothing here is precomputed or cached from a
// single "this month" snapshot.
export function CategorySpendNetworkSection({ categories, memberMap, accentPalette, sharedLabel, unnamedLabel }: CategorySpendNetworkSectionProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const isWide = width >= 760;

  const [period, setPeriod] = useState<Period>("1m");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const range = useMemo(() => periodDateRange(period, now), [period, now]);
  const transactionsQuery = useAllTransactions({ from: range.from, to: range.to });

  const nodes = useMemo(
    () =>
      buildCategorySpendNetworkNodes(
        categories,
        transactionsQuery.data ?? [],
        memberMap,
        accentPalette,
        sharedLabel,
        unnamedLabel,
      ),
    [categories, transactionsQuery.data, memberMap, accentPalette, sharedLabel, unnamedLabel],
  );
  const sortedNodes = useMemo(() => [...nodes].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)), [nodes]);
  const totalValue = useMemo(() => sortedNodes.reduce((sum, node) => sum + node.value, 0), [sortedNodes]);

  function handleSelect(id: string | null) {
    setSelectedId((current) => (id === null ? null : current === id ? null : id));
  }

  function handlePeriodChange(next: Period) {
    setPeriod(next);
    // A selected category can drop out of the list entirely when the
    // window changes (no spend in the new period) — clear rather than
    // leave a stale selection pointed at nothing.
    setSelectedId(null);
    setHoverId(null);
  }

  const periodSelector = (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(2) } as any}>
      {PERIOD_OPTIONS.map((option) => (
        <Pill
          key={option}
          label={t(`dashboard.categoryNetworkPeriod.${option}`)}
          active={period === option}
          onPress={() => handlePeriodChange(option)}
        />
      ))}
    </View>
  );

  if (transactionsQuery.isPending) {
    return (
      <View style={{ gap: spacing(3) } as any}>
        {periodSelector}
        <EmptyState
          title={t("dashboard.categoryNetworkLoadingTitle")}
          description={t("dashboard.categoryNetworkLoadingDescription")}
          icon="sync-outline"
        />
      </View>
    );
  }

  if (sortedNodes.length === 0) {
    return (
      <View style={{ gap: spacing(3) } as any}>
        {periodSelector}
        <EmptyState
          title={t("dashboard.categoryNetworkEmptyTitle")}
          description={t("dashboard.categoryNetworkEmptyDescription")}
          icon="git-network-outline"
        />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing(3) } as any}>
      {periodSelector}

      <View style={{ flexDirection: isWide ? "row" : "column", gap: spacing(3) } as any}>
        <View
          style={{
            width: isWide ? 240 : undefined,
            height: isWide ? 360 : 220,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing(2),
            backgroundColor: colors.surfaceMuted,
          } as any}
        >
          <CategorySpendSidebar nodes={sortedNodes} selectedId={selectedId} hoverId={hoverId} onSelect={handleSelect} onHover={setHoverId} />
        </View>

        <View
          style={{
            flex: isWide ? 1 : undefined,
            height: isWide ? 360 : 320,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            overflow: "hidden",
            backgroundColor: colors.surfaceMuted,
          } as any}
        >
          <CategorySpendGraphCanvas
            nodes={sortedNodes}
            selectedId={selectedId}
            hoverId={hoverId}
            onSelect={handleSelect}
            onHover={setHoverId}
            backgroundColor={colors.surfaceMuted}
            inkColor={colors.text}
            mutedColor={colors.textSecondary}
            accentColor={colors.primary}
            rimColor={colors.surface}
          />
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing(1.5) } as any}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
          {t("dashboard.categoryNetworkTotalLabel")}: {displayCurrency(formatCurrency(totalValue), hideValues)}
        </Text>
      </View>
    </View>
  );
}
