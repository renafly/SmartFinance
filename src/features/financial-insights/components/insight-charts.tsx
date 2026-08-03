import { useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { useTranslation } from "react-i18next";

import { formatCurrency } from "@/components/migrated-page";
import type { MonthlyFinancialReport } from "@/features/financial-insights/reports";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

const HEIGHT = 190;
const PAD = 18;

function useChartWidth() {
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const fallbackWidth = Math.max(180, Math.min(760, windowWidth - spacing(10)));

  return {
    width: measuredWidth || fallbackWidth,
    onLayout: (event: { nativeEvent: { layout: { width: number } } }) => {
      const nextWidth = Math.max(1, Math.floor(event.nativeEvent.layout.width));
      setMeasuredWidth((current) => (current === nextWidth ? current : nextWidth));
    },
  };
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(
    new Date(`${month}-01T00:00:00`),
  );
}

export function CashFlowChart({ data }: { data: MonthlyFinancialReport[] }) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { width, onLayout } = useChartWidth();
  const max = Math.max(
    1,
    ...data.flatMap((item) => [item.income, item.expenses]),
  );
  const slot = (width - PAD * 2) / Math.max(data.length, 1);
  const plotHeight = HEIGHT - 45;
  const netPoints = data.map((item, index) => {
    const x = PAD + slot * index + slot / 2;
    const normalized = (item.net + max) / (max * 2);
    return [x, PAD + plotHeight * (1 - normalized)] as const;
  });
  const path = netPoints
    .map(([x, y], index) => `${index ? "L" : "M"} ${x} ${y}`)
    .join(" ");
  const summary = data
    .map(
      (item) =>
        `${monthLabel(item.month)}: ${t("insights.chartIncome")} ${formatCurrency(item.income)}, ${t("insights.chartExpenses")} ${formatCurrency(item.expenses)}, ${t("insights.chartNet")} ${formatCurrency(item.net)}`,
    )
    .join(". ");

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${t("insights.monthlyCashFlow")}. ${summary}`}
    >
      <Svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
        <Line
          x1={PAD}
          x2={width - PAD}
          y1={PAD + plotHeight / 2}
          y2={PAD + plotHeight / 2}
          stroke={colors.border}
        />
        {data.map((item, index) => {
          const x = PAD + slot * index;
          const barWidth = Math.max(3, Math.min(14, slot * 0.24));
          const incomeHeight = (item.income / max) * (plotHeight / 2);
          const expenseHeight = (item.expenses / max) * (plotHeight / 2);
          return (
            <G key={item.month}>
              <Rect
                x={x + slot * 0.2}
                y={PAD + plotHeight / 2 - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                rx={2}
                fill={colors.financialPositive}
              />
              <Rect
                x={x + slot * 0.52}
                y={PAD + plotHeight / 2 - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                rx={2}
                fill={colors.financialNegative}
              />
            </G>
          );
        })}
        {path ? (
          <Path
            d={path}
            fill="none"
            stroke={colors.financialNeutral}
            strokeWidth={2.5}
          />
        ) : null}
        {netPoints.map(([x, y], index) => (
          <Circle
            key={data[index].month}
            cx={x}
            cy={y}
            r={3}
            fill={colors.financialNeutral}
          />
        ))}
      </Svg>
      <ChartLabels
        width={width}
        labels={data.map((item) => monthLabel(item.month))}
      />
      <Legend
        items={[
          [t("insights.chartIncome"), colors.financialPositive],
          [t("insights.chartExpenses"), colors.financialNegative],
          [t("insights.chartNet"), colors.financialNeutral],
        ]}
      />
    </View>
  );
}

export function SavingsRateChart({ data }: { data: MonthlyFinancialReport[] }) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { width, onLayout } = useChartWidth();
  const values = data.map((item) => item.savingsRate);
  const finite = values.filter((value): value is number => value !== null);
  const min = Math.min(0, ...finite);
  const max = Math.max(100, ...finite);
  const plotLeft = 42;
  const plotRight = 12;
  const plotHeight = HEIGHT - 45;
  const x = (index: number) =>
    plotLeft +
    index * ((width - plotLeft - plotRight) / Math.max(data.length - 1, 1));
  const y = (value: number) =>
    PAD + ((max - value) / Math.max(max - min, 1)) * plotHeight;
  const segments = (() => {
    const result: string[] = [];
    let current = "";
    values.forEach((value, index) => {
      if (value === null) {
        if (current) result.push(current);
        current = "";
        return;
      }
      current += `${current ? " L" : "M"} ${x(index)} ${y(value)}`;
    });
    if (current) result.push(current);
    return result;
  })();
  const summary = data
    .map(
      (item) =>
        `${monthLabel(item.month)}: ${item.savingsRate === null ? t("insights.notAvailable") : `${item.savingsRate}%`}`,
    )
    .join(". ");
  const ticks = [max, (max + min) / 2, min];

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${t("insights.savingsRate")}. ${summary}`}
    >
      <Svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
        {ticks.map((tick) => (
          <G key={tick}>
            <Line
              x1={plotLeft}
              x2={width - plotRight}
              y1={y(tick)}
              y2={y(tick)}
              stroke={colors.border}
              strokeDasharray={tick === 0 ? undefined : "4 4"}
            />
            <SvgText
              x={plotLeft - 6}
              y={y(tick) + 4}
              fill={colors.textSecondary}
              fontSize={10}
              textAnchor="end"
            >
              {`${Math.round(tick)}%`}
            </SvgText>
          </G>
        ))}
        {segments.map((segment) => (
          <Path
            key={segment}
            d={segment}
            fill="none"
            stroke={colors.financialGoal}
            strokeWidth={3}
          />
        ))}
        {values.map((value, index) =>
          value === null ? null : (
            <Circle
              key={data[index].month}
              cx={x(index)}
              cy={y(value)}
              r={4}
              fill={colors.financialGoal}
            />
          ),
        )}
      </Svg>
      <ChartLabels
        width={width}
        leftInset={plotLeft}
        rightInset={plotRight}
        labels={data.map((item) => monthLabel(item.month))}
      />
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          textAlign: "center",
          marginTop: spacing(2),
        }}
      >
        {t("insights.savingsRate")} (%)
      </Text>
    </View>
  );
}

export type CategoryChartItem = {
  id: string | null;
  label: string;
  amount: number;
  share: number;
  transactionCount: number;
};

export function CategorySpendingChart({ data }: { data: CategoryChartItem[] }) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((item) => item.amount));
  return (
    <View
      accessible
      accessibilityLabel={`${t("insights.spendingByCategory")}. ${data.map((item) => `${item.label}: ${formatCurrency(item.amount)}, ${item.share}%`).join(". ")}`}
    >
      {data.slice(0, 8).map((item) => (
        <View
          key={item.id ?? "uncategorized"}
          style={{ gap: spacing(1), marginBottom: spacing(3) }}
        >
          <View style={{ flexDirection: "row", gap: spacing(2) }}>
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              {item.label}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {item.transactionCount}× · {item.share}%
            </Text>
            <Text
              style={{ color: colors.text, minWidth: 80, textAlign: "right" }}
            >
              {formatCurrency(item.amount)}
            </Text>
          </View>
          <View
            style={{
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.surfaceMuted,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 10,
                width: `${(item.amount / max) * 100}%`,
                borderRadius: 5,
                backgroundColor: colors.primary,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function ChartLabels({
  labels,
  width,
  leftInset = PAD,
  rightInset = PAD,
}: {
  labels: string[];
  width: number;
  leftInset?: number;
  rightInset?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width,
        paddingLeft: leftInset,
        paddingRight: rightInset,
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      {labels.map((label, index) => (
        <Text
          key={`${label}-${index}`}
          style={{ color: colors.textSecondary, fontSize: 11 }}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: spacing(4),
        marginTop: spacing(3),
      }}
    >
      {items.map(([label, color]) => (
        <View
          key={label}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing(1),
          }}
        >
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: color,
            }}
          />
          <Text style={{ color: colors.textSecondary }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}
