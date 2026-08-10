import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { typography } from "@/theme/typography";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { Button, Pill, formatCurrency } from "@/components/migrated-page";
import { Badge, EmptyState } from "@/components/data-surface";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";

import type { ExplorerNode } from "../explorer-data";
import { CATEGORY_BROWSER_PERIOD_OPTIONS, type CategoryBrowserPeriod, type CategoryBrowserStats } from "../category-browser-data";

type CategoryBrowserDetailPanelProps = {
  node: ExplorerNode | null;
  stats: CategoryBrowserStats | null;
  isLoading: boolean;
  period: CategoryBrowserPeriod;
  onPeriodChange: (period: CategoryBrowserPeriod) => void;
  onSelectChild: (id: string) => void;
  onEdit: () => void;
  onAddChild: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
  archivePending: boolean;
  deletePending: boolean;
};

// Right column of the simple category browser: same CRUD actions as the 3D
// explorer's detail panel, plus the actual numbers a "manage my categories"
// screen needs — total for the selected window, transaction count, share of
// the household's overall income/expense/account total, a breakdown of
// immediate subcategories (tap one to drill in), recent activity, and who /
// which account the spending came from.
export function CategoryBrowserDetailPanel({
  node,
  stats,
  isLoading,
  period,
  onPeriodChange,
  onSelectChild,
  onEdit,
  onAddChild,
  onArchiveToggle,
  onDelete,
  archivePending,
  deletePending,
}: CategoryBrowserDetailPanelProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);

  const periodSelector = (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) } as any}>
      {CATEGORY_BROWSER_PERIOD_OPTIONS.map((option) => (
        <Pill
          key={option}
          label={
            option === "all"
              ? t("categories.browser.periodAll")
              : t(`dashboard.categoryNetworkPeriod.${option}`)
          }
          active={period === option}
          onPress={() => onPeriodChange(option)}
        />
      ))}
    </View>
  );

  if (!node) {
    return (
      <View style={{ flex: 1, gap: spacing(3) } as any}>
        {periodSelector}
        <View style={{ flex: 1, justifyContent: "center" } as any}>
          <EmptyState
            title={t("categories.browser.noSelectionTitle")}
            description={t("categories.browser.noSelectionHint")}
            icon="list-outline"
          />
        </View>
      </View>
    );
  }

  const totalLabel =
    node.categoryType === "income"
      ? t("categories.browser.totalIncomeLabel")
      : node.categoryType === "account"
        ? t("categories.browser.totalAmountLabel")
        : t("categories.browser.totalSpendingLabel");
  const breadcrumb = node.pathLabels.length ? node.pathLabels.join(" / ") : t("categories.topLevel");
  const percentLabel = stats ? `${(stats.percentOfType * 100).toFixed(1)}%` : "—";

  return (
    <ScrollView style={{ flex: 1 } as any} contentContainerStyle={{ gap: spacing(3), paddingBottom: spacing(4) } as any}>
      <View style={{ gap: spacing(1) } as any}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(2) } as any}>
          <View
            style={{
              width: spacing(9),
              height: spacing(9),
              borderRadius: radius.full,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            } as any}
          >
            <Ionicons name={node.icon} size={18} color={node.color} />
          </View>
          <View style={{ flex: 1, minWidth: 0 } as any}>
            <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[20] } as any} numberOfLines={2}>
              {node.label}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{breadcrumb}</Text>
          </View>
          {node.isArchived ? <Badge label={t("categories.archived")} tone="destructive" /> : null}
        </View>
      </View>

      {periodSelector}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(2) } as any}>
        <MetricTile
          label={totalLabel}
          value={isLoading ? "…" : displayCurrency(formatCurrency(stats?.total ?? 0), hideValues)}
        />
        <MetricTile
          label={t("categories.browser.transactionCountLabel")}
          value={isLoading ? "…" : String(stats?.count ?? 0)}
        />
        <MetricTile
          label={t("categories.browser.percentOfTotalLabel", { type: t(`categories.types.${node.categoryType}`) })}
          value={isLoading ? "…" : percentLabel}
        />
      </View>

      <View style={{ height: 1, backgroundColor: colors.border } as any} />

      <Section title={t("categories.browser.subcategoriesTitle")}>
        {!stats || stats.subcategories.length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontStyle: "italic" } as any}>
            {t("categories.browser.noSubcategories")}
          </Text>
        ) : (
          <View style={{ gap: spacing(1.5) } as any}>
            {stats.subcategories.map((child) => (
              <RowPressable key={child.id} onPress={() => onSelectChild(child.id)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(1.5), flex: 1, minWidth: 0 } as any}>
                  <Ionicons name={child.icon} size={14} color={child.color} />
                  <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.semibold, opacity: child.isArchived ? 0.5 : 1 } as any}>
                    {child.label}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" } as any}>
                  <Text style={{ color: colors.text, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.bold } as any}>
                    {displayCurrency(formatCurrency(child.total), hideValues)}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
                    {t("categories.browser.transactionCount", { count: child.count })}
                  </Text>
                </View>
              </RowPressable>
            ))}
          </View>
        )}
      </Section>

      <Section title={t("categories.browser.recentTransactionsTitle")}>
        {!stats || stats.recentTransactions.length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontStyle: "italic" } as any}>
            {t("categories.browser.noRecentTransactions")}
          </Text>
        ) : (
          <View style={{ gap: spacing(1.5) } as any}>
            {stats.recentTransactions.map((transaction) => (
              <View key={transaction.id} style={{ flexDirection: "row", alignItems: "center", gap: spacing(2), paddingVertical: spacing(1) } as any}>
                <View style={{ flex: 1, minWidth: 0 } as any}>
                  <Text numberOfLines={1} style={{ color: colors.text, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.semibold } as any}>
                    {transaction.title}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any} numberOfLines={1}>
                    {new Date(transaction.transactionDate).toLocaleDateString()}
                    {transaction.accountName ? ` · ${transaction.accountName}` : ""}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: typography.fontSize[13],
                    fontWeight: typography.fontWeight.extraBold,
                    color: transaction.type === "expense" ? colors.destructive : colors.success,
                  } as any}
                >
                  {transaction.type === "expense" ? "-" : "+"}
                  {displayCurrency(formatCurrency(transaction.amount), hideValues)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      {stats && (stats.byAccount.length > 0 || stats.byUser.length > 0) ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(3) } as any}>
          {stats.byAccount.length > 0 ? (
            <View style={{ flex: 1, minWidth: 160, gap: spacing(1.5) } as any}>
              <Text style={sectionTitleStyle(colors)}>{t("categories.browser.byAccountTitle")}</Text>
              {stats.byAccount.map((entry) => (
                <BreakdownRow key={entry.id} label={entry.label} total={entry.total} hideValues={hideValues} />
              ))}
            </View>
          ) : null}
          {stats.byUser.length > 0 ? (
            <View style={{ flex: 1, minWidth: 160, gap: spacing(1.5) } as any}>
              <Text style={sectionTitleStyle(colors)}>{t("categories.browser.byUserTitle")}</Text>
              {stats.byUser.map((entry) => (
                <BreakdownRow key={entry.id} label={entry.label} total={entry.total} hideValues={hideValues} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ height: 1, backgroundColor: colors.border } as any} />

      {node.categoryId ? (
        // All four actions stay on one row (Edit, Add Subcategory, Archive,
        // Delete) so they read as a single action bar; flexWrap lets them
        // drop to a second line on narrow screens instead of overflowing or
        // shrinking illegibly.
        <View style={{ flexDirection: "row", gap: spacing(2), flexWrap: "wrap" } as any}>
          <Button label={t("categories.edit")} onPress={onEdit} />
          <Button label={t("categories.browser.addChild")} variant="secondary" onPress={onAddChild} />
          <Button
            label={node.isArchived ? t("categories.restore") : t("categories.archive")}
            variant="secondary"
            onPress={onArchiveToggle}
            disabled={archivePending}
          />
          <Button label={t("delete")} variant="danger" onPress={onDelete} disabled={deletePending} />
        </View>
      ) : (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontStyle: "italic" } as any}>
          {t("categories.browser.typeNodeHint")}
        </Text>
      )}
    </ScrollView>
  );
}

function sectionTitleStyle(colors: ReturnType<typeof useTheme>["colors"]) {
  return {
    color: colors.textSecondary,
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold,
    textTransform: "uppercase" as const,
    letterSpacing: typography.letterSpacing[10],
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing(1.5) } as any}>
      <Text style={sectionTitleStyle(colors) as any}>{title}</Text>
      {children}
    </View>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: 140,
        padding: spacing(2.5),
        borderRadius: radius.lg,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing(0.5),
      } as any}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.fontSize[12],
          fontWeight: typography.fontWeight.extraBold,
          textTransform: "uppercase",
          letterSpacing: typography.letterSpacing[10],
        } as any}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text style={{ color: colors.text, fontSize: typography.fontSize[18], fontWeight: typography.fontWeight.extraBold } as any} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function BreakdownRow({ label, total, hideValues }: { label: string; total: number; hideValues: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing(2) } as any}>
      <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: typography.fontSize[12] } as any}>
        {label}
      </Text>
      <Text style={{ color: colors.text, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold } as any}>
        {displayCurrency(formatCurrency(total), hideValues)}
      </Text>
    </View>
  );
}

function RowPressable({ onPress, children }: { onPress: () => void; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing(2),
          padding: spacing(2),
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceMuted,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      {children}
    </Pressable>
  );
}
