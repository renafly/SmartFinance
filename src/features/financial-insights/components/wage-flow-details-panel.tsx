import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { formatCurrency, formatDate } from "@/components/migrated-page";
import type {
  WageFlowChartBucket,
  WageFlowChartSubcategory,
} from "@/features/financial-insights/components/insight-charts";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";
import { useResponsiveMetrics } from "@/theme/responsive";

const LIST_MAX_HEIGHT = 320;

/**
 * Collapsible side panel showing the transaction-level detail for whichever
 * wage-flow category is currently selected in the chart / category menu.
 * Fully controlled by the parent: it owns no selection state of its own,
 * it just renders whatever `category` it's handed (or a prompt/empty state
 * when nothing is selected yet).
 */
export function WageFlowDetailsPanel({
  category,
  collapsed,
  onToggleCollapsed,
}: {
  category: WageFlowChartBucket | null;
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
          ...(responsive.isPhone ? { flexDirection: "row" as const, gap: spacing(2) } : { gap: spacing(2) }),
        }}
      >
        <Pressable
          onPress={onToggleCollapsed}
          accessibilityRole="button"
          accessibilityLabel={t("insights.wageFlow.expandDetails")}
          hitSlop={8}
          style={({ pressed }) => [pressed ? { opacity: 0.6 } : null]}
        >
          <Ionicons
            name={responsive.isPhone ? "chevron-up-outline" : "chevron-back-outline"}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
        <Ionicons name="receipt-outline" size={16} color={colors.textSecondary} />
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
        padding: spacing(3.5),
        gap: spacing(3),
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
            fontSize: 14,
            fontWeight: typography.fontWeight.bold,
          }}
        >
          {t("insights.wageFlow.detailsTitle")}
        </Text>
        <Pressable
          onPress={onToggleCollapsed}
          accessibilityRole="button"
          accessibilityLabel={t("insights.wageFlow.collapseDetails")}
          hitSlop={8}
          style={({ pressed }) => [pressed ? { opacity: 0.6 } : null]}
        >
          <Ionicons
            name={responsive.isPhone ? "chevron-down-outline" : "chevron-forward-outline"}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      {category ? (
        <WageFlowDetailsBody category={category} />
      ) : (
        <View
          style={{
            paddingVertical: spacing(6),
            alignItems: "center",
            justifyContent: "center",
            gap: spacing(2),
          }}
        >
          <Ionicons name="swap-horizontal-outline" size={22} color={colors.textSecondary} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            {t("insights.wageFlow.selectCategoryPrompt")}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Drill-down list shown inside a selected main category's details, breaking
 * its total down by the real transaction categories that contributed to it
 * (plus a synthetic "Other" leftover -- see `buildSubcategories` in
 * `wage-flow.ts`). The parent's own summary (icon, name, total, share of
 * income, transaction list) stays rendered above/below this, unchanged --
 * this is purely an additional breakdown, not a replacement view.
 *
 * `subcategories` is expected pre-sorted by `calculateWageFlow` (share of
 * the bucket descending, ties broken by amount descending), so this just
 * renders them in the order given rather than re-deriving that order.
 */
function WageFlowSubcategoryBreakdown({
  subcategories,
}: {
  subcategories: WageFlowChartSubcategory[];
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);

  return (
    <View style={{ gap: spacing(2) }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          fontWeight: typography.fontWeight.semibold,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {t("insights.wageFlow.subcategoriesBreakdownTitle")}
      </Text>
      <View style={{ gap: spacing(2) }}>
        {subcategories.map((sub) => (
          <View
            key={sub.key}
            style={{ flexDirection: "row", alignItems: "center", gap: spacing(2) }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: sub.color,
              }}
            />
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 12.5,
                fontWeight: typography.fontWeight.medium,
              }}
              numberOfLines={1}
            >
              {sub.label}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {displayCurrency(formatCurrency(sub.amount), hideValues)}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                minWidth: 38,
                textAlign: "right",
              }}
            >
              {`${sub.share}%`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function WageFlowDetailsBody({ category }: { category: WageFlowChartBucket }) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const matches = category.matches ?? [];

  return (
    <View style={{ gap: spacing(3) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(2.5) }}>
        <View
          style={{
            width: spacing(9),
            height: spacing(9),
            borderRadius: radius.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${category.color}26`,
          }}
        >
          <Ionicons name={category.icon} size={18} color={category.color} />
        </View>
        <View style={{ flex: 1, gap: spacing(0.5) }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
              fontWeight: typography.fontWeight.bold,
            }}
            numberOfLines={2}
          >
            {category.label}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{`${category.share}%`}</Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: spacing(2),
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceMuted,
            paddingVertical: spacing(2.5),
            paddingHorizontal: spacing(2.5),
            gap: spacing(0.5),
          }}
        >
          <Text
            style={{
              color: category.amount < 0 ? colors.financialNegative : colors.financialPositive,
              fontSize: 16,
              fontWeight: typography.fontWeight.bold,
            }}
          >
            {category.amount < 0 ? "" : "+"}
            {displayCurrency(formatCurrency(category.amount), hideValues)}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            {t("insights.wageFlow.transactionCount", { count: matches.length })}
          </Text>
        </View>
      </View>

      {category.subcategories && category.subcategories.length > 0 ? (
        <WageFlowSubcategoryBreakdown subcategories={category.subcategories} />
      ) : null}

      {matches.length === 0 ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 13,
            paddingVertical: spacing(3),
            textAlign: "center",
          }}
        >
          {t("insights.wageFlow.noTransactionsInCategory")}
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: LIST_MAX_HEIGHT }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing(2.5) }}>
            {matches.map((match) => {
              const title = match.isTransfer
                ? t("insights.wageFlow.transferFrom", { account: match.accountLabel })
                : match.title;
              return (
                <View
                  key={match.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: spacing(2),
                    paddingBottom: spacing(2.5),
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flex: 1, gap: spacing(0.5) }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 13,
                        fontWeight: typography.fontWeight.semibold,
                      }}
                      numberOfLines={1}
                    >
                      {title}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
                      {`${formatDate(match.transactionDate)} · ${match.accountLabel} · ${match.ownerLabel}`}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: match.amount < 0 ? colors.financialNegative : colors.financialPositive,
                      fontSize: 13,
                      fontWeight: typography.fontWeight.semibold,
                      textAlign: "right",
                    }}
                  >
                    {match.amount < 0 ? "" : "+"}
                    {displayCurrency(formatCurrency(match.amount), hideValues)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
