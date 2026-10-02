import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { Badge } from "@/components/data-surface";
import { formatCurrency } from "@/components/migrated-page";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { radius } from "@/theme/radius";
import { computeEffectiveAmount } from "@/features/transactions/utils/reimbursements";

/**
 * One "Payment breakdown" card for the add/edit transaction forms, grouping
 * where the money came from ("Paid from": the account picker or the Split
 * Source editor) with the money that came back ("Reimbursed by": the
 * Reimbursement editor), plus a single Paid / Reimbursed / Effective cost
 * summary line.
 *
 * Purely presentational: split allocations and reimbursements stay
 * separate data (a split must sum to the expense amount and moves money
 * out now; a reimbursement has its own expected total and moves money back
 * in), each editor keeps its own validation, and the caller still saves
 * them separately.
 *
 * The card is collapsible from its header (expanded by default, since the
 * "Paid from" account is required); collapsed, it shows the Paid /
 * Reimbursed / Effective cost line so the totals stay visible.
 *
 * `bare` renders just `paidFrom` with no card, for movements the card
 * doesn't apply to (transfers) so the caller doesn't need two JSX branches.
 */
export function PaymentBreakdownSection({
  bare = false,
  originalAmount,
  reimbursements,
  reimbursedBy,
  children,
}: {
  bare?: boolean;
  originalAmount: number;
  /** Rows counted in the summary line; the summary is hidden while empty. */
  reimbursements: readonly { amount: number }[];
  /** The Reimbursement editor, or null when the movement isn't an expense. */
  reimbursedBy?: ReactNode;
  /** The "Paid from" controls. */
  children: ReactNode;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  if (bare) return <>{children}</>;

  const breakdown = computeEffectiveAmount(originalAmount, reimbursements);
  const hasReimbursements = Boolean(reimbursedBy) && breakdown.reimbursedTotal > 0;
  const showSummary = hasReimbursements || collapsed;

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        accessibilityLabel={t(
          collapsed ? "transactions.paymentBreakdown.expand" : "transactions.paymentBreakdown.collapse",
        )}
        onPress={() => setCollapsed((value) => !value)}
        hitSlop={8}
        style={styles.header}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          {t("transactions.paymentBreakdown.title")}
        </Text>
        <Ionicons
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>

      {collapsed ? null : (
      <>
      <View style={styles.group}>
        <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
          {t("transactions.paymentBreakdown.paidFrom")}
        </Text>
        {children}
      </View>

      {reimbursedBy ? (
        <View style={[styles.group, styles.divided, { borderColor: colors.border }]}>
          <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
            {t("transactions.paymentBreakdown.reimbursedBy")}
          </Text>
          {reimbursedBy}
        </View>
      ) : null}
      </>
      )}

      {showSummary ? (
        <View style={[styles.summary, collapsed ? null : { borderColor: colors.border }, collapsed ? styles.summaryCollapsed : null]}>
          <Text style={{ color: colors.textSecondary }}>
            {t("transactions.paymentBreakdown.summaryPaid", {
              amount: formatCurrency(breakdown.originalAmount),
            })}
            {hasReimbursements ? "  ·  " : null}
            {hasReimbursements
              ? t("transactions.paymentBreakdown.summaryReimbursed", {
                  amount: formatCurrency(breakdown.reimbursedTotal),
                })
              : null}
          </Text>
          {hasReimbursements ? (
          <View style={styles.effectiveRow}>
            <Text style={{ color: colors.text, fontWeight: "700" as any }}>
              {t("transactions.paymentBreakdown.summaryEffective", {
                amount: formatCurrency(breakdown.effectiveAmount),
              })}
            </Text>
            {breakdown.isOverReimbursed ? (
              <Badge label={t("transactions.reimbursements.overReimbursedBadge")} tone="success" />
            ) : null}
          </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing(2),
    gap: spacing(2),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(1),
  },
  title: { fontSize: 15, fontWeight: "700" },
  group: { gap: spacing(1.5) },
  groupLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing(2),
  },
  summary: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing(1.5),
    gap: spacing(0.5),
  },
  summaryCollapsed: { borderTopWidth: 0, paddingTop: 0 },
  effectiveRow: { flexDirection: "row", alignItems: "center", gap: spacing(1), flexWrap: "wrap" },
});
