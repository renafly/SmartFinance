import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { formatCurrency } from "@/components/migrated-page";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useResponsiveMetrics } from "@/theme/responsive";

// react-native-svg's web shim only wraps touch-responder handling (which leaks
// legacy `onResponder*` props onto the DOM and triggers React warnings) when it
// sees `onPress`/`onPressIn`/`onPressOut`/`onLongPress`. `onClick` bypasses that
// path entirely and is forwarded straight through as a normal DOM handler, so we
// use it on web while keeping `onPress` for native.
function svgPressProps(onSelect: () => void) {
  return Platform.OS === "web" ? { onClick: onSelect } : { onPress: onSelect };
}

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

export type WageFlowChartMatch = {
  id: string;
  title: string;
  amount: number;
  transactionDate: string;
  accountLabel: string;
  ownerLabel: string;
  isTransfer: boolean;
};

export type WageFlowChartBucket = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  amount: number;
  /** Share of income, 0-100 (not clamped). */
  share: number;
  color: string;
  /** The transactions this category claimed, for the "what funded this"
   * drill-down. Omitted for the synthetic Unallocated segment. */
  matches?: WageFlowChartMatch[];
};

const WAGE_FLOW_HEIGHT = 250;
const WAGE_FLOW_PAD = 16;
const WAGE_FLOW_BAR_WIDTH = 14;
const WAGE_FLOW_GAP = 10;

/**
 * A Sankey-style flow diagram: a single "Income" bar on the left, ribbons
 * fanning out to one bar per bucket on the right, each sized by its share of
 * income. Buckets are supplied fully computed (see calculateWageFlow) --
 * this component only lays them out and draws them with the app's own
 * theme colors.
 *
 * If the buckets don't add up to all of income, the leftover is drawn as a
 * neutral "Unallocated" segment rather than silently stretching the other
 * segments to fill 100% -- the chart should never imply money was
 * accounted for when it wasn't.
 *
 * Selection is fully controlled by the parent: tapping a segment in the SVG
 * just calls `onSelectKey(key)` with the tapped segment's key -- the parent
 * decides whether that's a new selection or a toggle-off (see
 * `handleSelectWageFlowKey` in the dashboard screen), so the same handler can
 * be shared with the standalone `WageFlowCategoryMenu` the parent renders
 * alongside this chart. This component owns no selection state and renders
 * no menu or transaction drill-down itself -- the category menu and the
 * details side panel are both siblings the caller lays out next to this
 * chart, driven by `selectedKey`.
 */
export function WageFlowChart({
  income,
  buckets,
  periodLabel,
  selectedKey,
  onSelectKey,
}: {
  income: number;
  buckets: WageFlowChartBucket[];
  /** e.g. "August 2026" -- shown next to the Income label above the chart. */
  periodLabel?: string;
  /** Key of the currently-selected bucket (or the synthetic "unallocated"
   * segment), or null when nothing is selected. */
  selectedKey: string | null;
  /** Call with the tapped segment's `key`. The parent owns toggle-off
   * behavior (calling again with the already-selected key should deselect
   * it) so this same callback can be shared with `WageFlowCategoryMenu`. */
  onSelectKey: (key: string) => void;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { width, onLayout } = useChartWidth();

  // Categories tied to a specific account/pot can now report a true signed
  // net (e.g. a savings pot that had more withdrawn than deposited this
  // period nets negative) -- see calculateWageFlow. A Sankey ribbon can't
  // have negative height, so geometry is computed from the amount clamped
  // to 0, while labels/accessibility text below still show the real signed
  // amount so a net-outflow category isn't misrepresented as zero.
  const totalAllocated = buckets.reduce((sum, item) => sum + Math.max(0, item.amount), 0);
  const remaining = Math.max(0, income - totalAllocated);
  const denominator = Math.max(income, totalAllocated, 1);

  const segments =
    remaining > 0
      ? [
          ...buckets,
          {
            key: "unallocated",
            label: t("insights.wageFlow.unallocated"),
            icon: "ellipse-outline" as const,
            amount: remaining,
            share: income > 0 ? Math.round((remaining / income) * 10_000) / 100 : 0,
            color: colors.border,
          },
        ]
      : buckets;

  const plotTop = WAGE_FLOW_PAD;
  const plotBottom = WAGE_FLOW_HEIGHT - WAGE_FLOW_PAD;
  const plotHeight = plotBottom - plotTop;
  const totalGap = WAGE_FLOW_GAP * Math.max(segments.length - 1, 0);
  const availableHeight = Math.max(plotHeight - totalGap, 1);

  const leftX = WAGE_FLOW_PAD;
  const rightX = width - WAGE_FLOW_PAD - WAGE_FLOW_BAR_WIDTH;
  const midX = (leftX + WAGE_FLOW_BAR_WIDTH + rightX) / 2;

  let leftCursor = plotTop;
  let rightCursor = plotTop;
  const ribbons = segments.map((segment) => {
    const height = (Math.max(0, segment.amount) / denominator) * availableHeight;
    const leftTop = leftCursor;
    const leftBottom = leftCursor + height;
    const rightTop = rightCursor;
    const rightBottom = rightCursor + height;
    leftCursor = leftBottom;
    rightCursor = rightBottom + WAGE_FLOW_GAP;
    const d = [
      `M ${leftX + WAGE_FLOW_BAR_WIDTH} ${leftTop}`,
      `C ${midX} ${leftTop}, ${midX} ${rightTop}, ${rightX} ${rightTop}`,
      `L ${rightX} ${rightBottom}`,
      `C ${midX} ${rightBottom}, ${midX} ${leftBottom}, ${leftX + WAGE_FLOW_BAR_WIDTH} ${leftBottom}`,
      "Z",
    ].join(" ");
    return { ...segment, d, rightTop, rightBottom, height };
  });
  const incomeBarBottom = plotTop + availableHeight;

  const incomeLabel = periodLabel
    ? `${t("insights.wageFlow.income")} · ${periodLabel}`
    : t("insights.wageFlow.income");

  const summary = [
    `${incomeLabel}: ${formatCurrency(income)}`,
    ...buckets.map(
      (item) => `${item.label}: ${formatCurrency(item.amount)}, ${item.share}%`,
    ),
  ].join(". ");

  const hasSelection = selectedKey !== null;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${t("insights.wageFlow.title")}. ${summary}`}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing(2),
        }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: typography.fontWeight.semibold }}>
          {incomeLabel}
        </Text>
        <Text style={{ color: colors.financialPositive, fontWeight: typography.fontWeight.bold }}>
          {formatCurrency(income)}
        </Text>
      </View>
      <View onLayout={onLayout}>
        <Svg width={width} height={WAGE_FLOW_HEIGHT} viewBox={`0 0 ${width} ${WAGE_FLOW_HEIGHT}`}>
          {ribbons.map((segment) => {
            const isSelected = segment.key === selectedKey;
            return (
              <Path
                key={segment.key}
                d={segment.d}
                fill={segment.color}
                fillOpacity={isSelected ? 0.78 : hasSelection ? 0.2 : 0.5}
                stroke={isSelected ? segment.color : "none"}
                strokeWidth={isSelected ? 1.5 : 0}
                {...svgPressProps(() => onSelectKey(segment.key))}
                accessibilityLabel={`${segment.label}, ${segment.share}%, ${formatCurrency(segment.amount)}`}
              />
            );
          })}
          <Rect
            x={leftX}
            y={plotTop}
            width={WAGE_FLOW_BAR_WIDTH}
            height={Math.max(incomeBarBottom - plotTop, 1)}
            rx={2}
            fill={colors.financialPositive}
          />
          {ribbons.map((segment) => {
            const isSelected = segment.key === selectedKey;
            return (
              <Rect
                key={segment.key}
                x={rightX}
                y={segment.rightTop}
                width={isSelected ? WAGE_FLOW_BAR_WIDTH + 4 : WAGE_FLOW_BAR_WIDTH}
                height={Math.max(segment.height, 1)}
                rx={3}
                fill={segment.color}
                fillOpacity={hasSelection && !isSelected ? 0.55 : 1}
                stroke={isSelected ? colors.text : "none"}
                strokeWidth={isSelected ? 1.5 : 0}
                {...svgPressProps(() => onSelectKey(segment.key))}
                accessibilityLabel={`${segment.label}, ${segment.share}%, ${formatCurrency(segment.amount)}`}
              />
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

const CATEGORY_LIST_MAX_HEIGHT = 300;

/**
 * Compact, collapsible vertical menu for the wage-flow categories. Rendered
 * by the caller as its own column between the Sankey chart and the details
 * side panel (Wage Flow -> Categories -> Details), so picking a category
 * feels directly tied to the flow without crowding either the chart or the
 * transaction drill-down. Renders as a single-column list of compact rows
 * (dot + name + share%), scrollable past `CATEGORY_LIST_MAX_HEIGHT` rather
 * than a data table -- amounts and transaction detail live in the side panel
 * the parent renders based on `selectedKey`, not here.
 *
 * Selection is fully controlled by the parent: tapping a row just calls
 * `onSelectKey(key)`, sharing the same handler (and so the same toggle-off
 * behavior) as tapping a segment directly in `WageFlowChart`.
 */
export function WageFlowCategoryMenu({
  buckets,
  selectedKey,
  onSelectKey,
  collapsed,
  onToggleCollapsed,
}: {
  buckets: WageFlowChartBucket[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();

  if (collapsed) {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: responsive.isPhone ? "center" : "flex-start",
          paddingVertical: spacing(3),
          paddingHorizontal: spacing(2),
          ...(responsive.isPhone
            ? { flexDirection: "row" as const, gap: spacing(2) }
            : { gap: spacing(2) }),
        }}
      >
        <Pressable
          onPress={onToggleCollapsed}
          accessibilityRole="button"
          accessibilityLabel={t("insights.wageFlow.expandMenu")}
          hitSlop={8}
          style={({ pressed }) => [pressed ? { opacity: 0.6 } : null]}
        >
          <Ionicons
            name={responsive.isPhone ? "chevron-down-outline" : "chevron-forward-outline"}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
        <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        padding: spacing(3),
        gap: spacing(2.5),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 12,
            fontWeight: typography.fontWeight.bold,
          }}
        >
          {t("insights.wageFlow.categoriesMenuLabel")}
        </Text>
        <Pressable
          onPress={onToggleCollapsed}
          accessibilityRole="button"
          accessibilityLabel={t("insights.wageFlow.collapseMenu")}
          hitSlop={8}
          style={({ pressed }) => [pressed ? { opacity: 0.6 } : null]}
        >
          <Ionicons
            name={responsive.isPhone ? "chevron-up-outline" : "chevron-back-outline"}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>
      <ScrollView style={{ maxHeight: CATEGORY_LIST_MAX_HEIGHT }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing(1.5) }}>
          {buckets.map((item) => {
            const isSelected = item.key === selectedKey;
            return (
              <Pressable
                key={item.key}
                onPress={() => onSelectKey(item.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={
                  isSelected
                    ? `${item.label}, ${item.share}%, ${t("insights.wageFlow.selectedCategory")}`
                    : `${item.label}, ${item.share}%`
                }
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing(1.5),
                    paddingVertical: spacing(1.5),
                    paddingHorizontal: spacing(2),
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: isSelected ? item.color : "transparent",
                    backgroundColor: isSelected ? `${item.color}22` : colors.surfaceMuted,
                  },
                  pressed ? { opacity: 0.75 } : null,
                ]}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: item.color,
                  }}
                />
                <Text
                  style={{
                    flex: 1,
                    color: isSelected ? colors.text : colors.textSecondary,
                    fontSize: 12,
                    fontWeight: isSelected
                      ? typography.fontWeight.bold
                      : typography.fontWeight.medium,
                  }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{item.share}%</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
