import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button, formatCurrency } from "@/components/migrated-page";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { radius } from "@/theme/radius";
import { useResponsiveMetrics } from "@/theme/responsive";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

import type { TagPeriodRange, TagSummary } from "../types";
import { TagTransactionsList } from "./tag-transactions-list";

type TagSummaryCardProps = {
  tag: TagSummary;
  range: TagPeriodRange;
  expanded: boolean;
  hideValues: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
};

/** One tag in the Tags list: name, net total, count, and an expandable transaction list. */
export function TagSummaryCard({
  tag,
  range,
  expanded,
  hideValues,
  onToggle,
  onRename,
  onDelete,
}: TagSummaryCardProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: expanded ? colors.primary : colors.border,
          padding: responsive.isPhone ? spacing(3) : spacing(4),
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${tag.name}, ${expanded ? t("tags.hideTransactions") : t("tags.showTransactions")}`}
          style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
        >
          <View style={[styles.iconBadge, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="pricetag" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: spacing(0.5) }}>
            <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
              {tag.name}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {t("tags.transactionCount", { count: tag.transactionCount })}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: spacing(0.5) }}>
            <Text
              style={[
                styles.total,
                {
                  color: colors.text,
                  fontSize: responsive.isPhone ? typography.fontSize[16] : typography.fontSize[18],
                },
              ]}
            >
              {displayCurrency(formatCurrency(tag.netTotal), hideValues)}
            </Text>
            {tag.reimbursedTotal > 0 ? (
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {t("tags.reimbursedHint", {
                  gross: displayCurrency(formatCurrency(tag.grossTotal), hideValues),
                  reimbursed: displayCurrency(formatCurrency(tag.reimbursedTotal), hideValues),
                })}
              </Text>
            ) : null}
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
        {/* Phones: rename/delete move into the expanded area (as labelled
            buttons) so the collapsed row stays readable at narrow widths. */}
        {!responsive.isPhone ? (
        <View style={styles.actions} accessibilityLabel={t("tags.actionsFor", { name: tag.name })}>
          <Pressable
            onPress={onRename}
            accessibilityRole="button"
            accessibilityLabel={`${t("tags.rename")} ${tag.name}`}
            style={({ pressed }) => [
              styles.iconButton,
              { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="create-outline" size={16} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={`${t("tags.delete")} ${tag.name}`}
            style={({ pressed }) => [
              styles.iconButton,
              { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.destructive} />
          </Pressable>
        </View>
        ) : null}
      </View>
      {expanded ? (
        <View style={{ marginTop: spacing(3), gap: spacing(3) }}>
          {responsive.isPhone ? (
            <View style={{ flexDirection: "row", gap: spacing(2) }}>
              <Button label={t("tags.rename")} variant="secondary" onPress={onRename} />
              <Button label={t("tags.delete")} variant="danger" onPress={onDelete} />
            </View>
          ) : null}
          <TagTransactionsList tagId={tag.id} range={range} hideValues={hideValues} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  summary: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
  },
  iconBadge: {
    width: spacing(8),
    height: spacing(8),
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: typography.fontSize[15],
    fontWeight: typography.fontWeight.semibold as any,
  },
  meta: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  total: {
    fontWeight: typography.fontWeight.bold as any,
  },
  actions: {
    flexDirection: "row",
    gap: spacing(1.5),
  },
  iconButton: {
    width: spacing(9),
    height: spacing(9),
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.75,
  },
});
