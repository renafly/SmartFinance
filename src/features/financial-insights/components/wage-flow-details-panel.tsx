import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { formatCurrency, formatDate } from "@/components/migrated-page";
import type { WageFlowChartBucket } from "@/features/financial-insights/components/insight-charts";
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

function WageFlowDetailsBody({ category }: { category: WageFlowChartBucket }) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
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
            {formatCurrency(category.amount)}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            {t("insights.wageFlow.transactionCount", { count: matches.length })}
          </Text>
        </View>
      </View>

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
                    {formatCurrency(match.amount)}
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
