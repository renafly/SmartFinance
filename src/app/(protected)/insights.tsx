import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { EmptyState, MetricCard } from "@/components/data-surface";
import {
  Card,
  Page,
  Section,
  formatCurrency,
} from "@/components/migrated-page";
import { useAccountsWithBalances } from "@/features/accounts/hooks";
import { useCategories } from "@/features/categories/hooks";
import {
  buildFinancialInsights,
  calculateMonthlyFinancialReport,
} from "@/features/financial-insights";
import {
  CashFlowChart,
  CategorySpendingChart,
  SavingsRateChart,
} from "@/features/financial-insights/components/insight-charts";
import { useRecurringTransactions } from "@/features/recurring-transactions/hooks";
import { useAllTransactions } from "@/features/transactions/hooks/useTransactions";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type RangePreset = "3m" | "6m" | "12m" | "ytd";

function dateRange(preset: RangePreset, now: Date) {
  const start =
    preset === "ytd"
      ? new Date(now.getFullYear(), 0, 1)
      : new Date(
          now.getFullYear(),
          now.getMonth() - Number.parseInt(preset, 10) + 1,
          1,
        );
  return {
    from: localDate(start),
    to: localDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

export default function InsightsScreen() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const [rangePreset, setRangePreset] = useState<RangePreset>("6m");
  const now = useMemo(() => new Date(), []);
  const chartRange = useMemo(
    () => dateRange(rangePreset, now),
    [now, rangePreset],
  );
  const from = chartRange.from;
  const to = localDate(new Date(now.getFullYear(), now.getMonth() + 2, 0));
  const transactionsQuery = useAllTransactions({
    from: chartRange.from,
    to: chartRange.to,
  });
  const recurringQuery = useRecurringTransactions();
  const accountsQuery = useAccountsWithBalances();
  const categoriesQuery = useCategories("expense");

  const insights = useMemo(
    () =>
      buildFinancialInsights({
        transactions: (transactionsQuery.data ?? []) as any,
        recurringRules: (recurringQuery.data ?? []) as any,
        accounts: (accountsQuery.data ?? []) as any,
        from,
        to,
      }),
    [accountsQuery.data, from, recurringQuery.data, to, transactionsQuery.data],
  );
  const monthlyReport = useMemo(
    () =>
      calculateMonthlyFinancialReport(
        (transactionsQuery.data ?? []) as any,
        chartRange,
      ),
    [chartRange, transactionsQuery.data],
  );
  const categoryNames = useMemo(
    () =>
      new Map(
        (categoriesQuery.data ?? []).map((category: any) => [
          category.id,
          category.name,
        ]),
      ),
    [categoriesQuery.data],
  );
  const categoryChartData = insights.categorySpending.map((item) => ({
    ...item,
    label: item.id
      ? (categoryNames.get(item.id) ?? t("insights.unknownCategory"))
      : t("insights.uncategorized"),
  }));
  const selectedRangeLabel = t(
    rangePreset === "3m"
      ? "insights.range3Months"
      : rangePreset === "6m"
        ? "insights.range6Months"
        : rangePreset === "12m"
          ? "insights.range12Months"
          : "insights.rangeYtd",
  );

  return (
    <Page title={t("insights.title")} subtitle={t("insights.subtitle")}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("insights.dateRange")}
        style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(2) }}
      >
        {(
          [
            ["3m", t("insights.range3Months")],
            ["6m", t("insights.range6Months")],
            ["12m", t("insights.range12Months")],
            ["ytd", t("insights.rangeYtd")],
          ] as const
        ).map(([value, label]) => {
          const selected = rangePreset === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setRangePreset(value)}
              style={{
                paddingHorizontal: spacing(3),
                paddingVertical: spacing(2),
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primarySoft : colors.surface,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: selected
                    ? typography.fontWeight.bold
                    : typography.fontWeight.regular,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(3) }}>
        <View style={{ flex: 1, minWidth: 180 }}>
          <MetricCard
            label={t("insights.incomeForPeriod", { period: selectedRangeLabel })}
            value={formatCurrency(insights.cashFlow.income)}
          />
        </View>
        <View style={{ flex: 1, minWidth: 180 }}>
          <MetricCard
            label={t("insights.expensesForPeriod", { period: selectedRangeLabel })}
            value={formatCurrency(insights.cashFlow.expenses)}
          />
        </View>
        <View style={{ flex: 1, minWidth: 180 }}>
          <MetricCard
            label={t("insights.netCashFlowForPeriod", { period: selectedRangeLabel })}
            value={formatCurrency(insights.cashFlow.net)}
          />
        </View>
        <View style={{ flex: 1, minWidth: 180 }}>
          <MetricCard
            label={t("insights.subscriptionMonthly")}
            value={formatCurrency(insights.subscriptions.monthlyTotal)}
          />
        </View>
      </View>

      <Card>
        <Section
          title={t("insights.monthlyCashFlow")}
          subtitle={t("insights.monthlyCashFlowSubtitle")}
        >
          <CashFlowChart data={monthlyReport} />
        </Section>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(3) }}>
        <View style={{ flex: 1, minWidth: 300 }}>
          <Card>
            <Section
              title={t("insights.spendingByCategory")}
              subtitle={t("insights.spendingByCategorySubtitle")}
            >
              {categoryChartData.length ? (
                <CategorySpendingChart data={categoryChartData} />
              ) : (
                <EmptyState title={t("insights.noSpending")} />
              )}
            </Section>
          </Card>
        </View>
        <View style={{ flex: 1, minWidth: 300 }}>
          <Card>
            <Section
              title={t("insights.savingsRate")}
              subtitle={t("insights.savingsRateSubtitle")}
            >
              <SavingsRateChart data={monthlyReport} />
            </Section>
          </Card>
        </View>
      </View>

      <Card>
        <Section
          title={t("insights.upcoming")}
          subtitle={t("insights.upcomingSubtitle")}
        >
          {insights.billCalendar.length ? (
            <View style={{ gap: spacing(2) }}>
              {insights.billCalendar.slice(0, 12).map((item) => (
                <View
                  key={`${item.ruleId}-${item.date}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing(3),
                    padding: spacing(3),
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                    backgroundColor: colors.surfaceMuted,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: typography.fontWeight.bold,
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text style={{ color: colors.textSecondary }}>
                      {item.date}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color:
                        item.type === "income"
                          ? colors.financialPositive
                          : colors.financialNegative,
                      fontWeight: typography.fontWeight.bold,
                    }}
                  >
                    {item.type === "income" ? "+" : "-"}
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState title={t("insights.noUpcoming")} />
          )}
        </Section>
      </Card>

      <Card>
        <Section
          title={t("insights.merchants")}
          subtitle={t("insights.merchantsSubtitle")}
        >
          {insights.merchantSpending.length ? (
            <View style={{ gap: spacing(2) }}>
              {insights.merchantSpending.slice(0, 10).map((item) => (
                <View
                  key={item.merchant}
                  style={{ flexDirection: "row", gap: spacing(3) }}
                >
                  <Text style={{ flex: 1, color: colors.text }}>
                    {item.merchant}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {item.transactionCount}×
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: typography.fontWeight.semibold,
                    }}
                  >
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState title={t("insights.noSpending")} />
          )}
        </Section>
      </Card>

    </Page>
  );
}
