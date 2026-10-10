import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, formatCurrency } from "@/components/migrated-page";
import { translateCategoryName } from "@/features/categories/category-names";
import { AllocationDonut, AllocationLegend, type DonutSegment } from "@/features/dashboard";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

import { useTagTransactionsForTags } from "../hooks/useTags";
import { buildTagCategoryBreakdown, OTHER_SLICE_KEY, UNCATEGORIZED_SLICE_KEY } from "../services/tag-category-breakdown";
import type { TagPeriodRange } from "../types";

/** Slices incl. the folded "Other" -- never more categories than palette colors, so none repeat. */
const MAX_SLICES = 6;

type TagCategoryChartProps = {
  /** The tags currently shown in the list (period + search applied). */
  tagIds: readonly string[];
  range: TagPeriodRange;
  hideValues: boolean;
};

function isIoniconName(name: string | null): name is keyof typeof Ionicons.glyphMap {
  return !!name && Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, name);
}

/**
 * "Spending by category" doughnut shown beside the Tags list. Built from the
 * same per-tag transaction queries the expanded rows use, deduplicated so an
 * expense with several tags counts once (see buildTagCategoryBreakdown), and
 * drawn with the dashboard's AllocationDonut/AllocationLegend.
 */
export function TagCategoryChart({ tagIds, range, hideValues }: TagCategoryChartProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const query = useTagTransactionsForTags(tagIds, range);

  const breakdown = useMemo(
    () =>
      buildTagCategoryBreakdown(query.lists, {
        maxSlices: MAX_SLICES,
        uncategorizedLabel: t("tags.details.uncategorized"),
        otherLabel: t("tags.chart.other"),
      }),
    [query.lists, t],
  );

  const segments = useMemo<DonutSegment[]>(() => {
    // Theme tokens only (no hard-coded hex) so light/dark/blue palettes all work.
    const palette = [
      colors.primary,
      colors.financialAttention,
      colors.financialGoal,
      colors.destructive,
      colors.gradientTo,
      colors.success,
    ];
    let paletteIndex = 0;
    return breakdown.slices.map((slice) => {
      const color =
        slice.key === OTHER_SLICE_KEY
          ? colors.textSecondary
          : slice.key === UNCATEGORIZED_SLICE_KEY
            ? colors.borderStrong
            : palette[paletteIndex++ % palette.length];
      return {
        key: slice.key,
        // Same default-category translation the tag rows' table uses.
        label:
          slice.key === OTHER_SLICE_KEY || slice.key === UNCATEGORIZED_SLICE_KEY
            ? slice.label
            : translateCategoryName(slice.label, t),
        value: slice.value,
        color,
        icon:
          slice.key === OTHER_SLICE_KEY
            ? "ellipsis-horizontal"
            : isIoniconName(slice.icon)
              ? slice.icon
              : "pricetag-outline",
      };
    });
  }, [breakdown.slices, colors, t]);

  const mutedText = {
    color: colors.textSecondary,
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  };

  let body;
  if (query.isLoading && breakdown.transactionCount === 0) {
    body = (
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(2), paddingVertical: spacing(4) }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={mutedText}>{t("tags.chart.loading")}</Text>
      </View>
    );
  } else if (query.isError && breakdown.transactionCount === 0) {
    body = (
      <View style={{ gap: spacing(2) }}>
        <Text style={[mutedText, { color: colors.destructive }]} accessibilityLiveRegion="polite">
          {t("tags.chart.loadError")}
        </Text>
        <Pressable onPress={query.refetchFailed} accessibilityRole="button">
          <Text style={{ color: colors.link, fontSize: typography.fontSize[13] }}>{t("tags.retry")}</Text>
        </Pressable>
      </View>
    );
  } else if (breakdown.total <= 0) {
    body = <Text style={mutedText}>{t("tags.chart.empty")}</Text>;
  } else {
    body = (
      <View style={{ gap: spacing(4), alignItems: "stretch" }}>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t("tags.chart.accessibilityLabel", {
            total: displayCurrency(formatCurrency(breakdown.total), hideValues),
            count: breakdown.slices.length,
          })}
        >
          <AllocationDonut
            segments={segments}
            total={breakdown.total}
            centerValue={displayCurrency(formatCurrency(breakdown.total), hideValues)}
            centerLabel={t("tags.chart.total")}
            roundCaps={false}
          />
        </View>
        <AllocationLegend segments={segments} total={breakdown.total} />
        {query.isError ? (
          <Text style={[mutedText, { color: colors.destructive }]}>{t("tags.chart.partialError")}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <Card>
      <View style={{ gap: spacing(1) }}>
        <Text style={{ color: colors.text, fontSize: typography.fontSize[16], fontWeight: typography.fontWeight.bold as any }}>
          {t("tags.chart.title")}
        </Text>
        <Text style={mutedText}>{t("tags.chart.subtitle")}</Text>
      </View>
      {body}
    </Card>
  );
}
