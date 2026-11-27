import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { Badge } from "@/components/data-surface";
import { formatCurrency } from "@/components/migrated-page";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { radius } from "@/theme/radius";
import { computeEffectiveAmount } from "@/features/transactions/utils/reimbursements";

/**
 * The "Payment" card of the add/edit transaction forms, laid out in the
 * order the money actually works:
 *   1. Summary: Paid / Reimbursed / Effective cost, always visible (also
 *      while collapsed), so the number that matters is never at the end.
 *   2. Reimbursements: what came back -- it decides how much is left to
 *      split.
 *   3. Who bears the cost: the "Paid from" account, or the split of the
 *      effective cost across accounts.
 *
 * Purely presentational: the reimbursement and split editors keep their
 * own state and validation; the caller saves them (see funding.ts).
 *
 * `bare` renders just `children` with no card, for movements the card
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
  /** Rows counted in the summary; reimbursed/effective tiles show only when some exist. */
  reimbursements: readonly { amount: number }[];
  /** The Reimbursement editor, or null when the movement isn't an expense. */
  reimbursedBy?: ReactNode;
  /** The "Paid from" / split controls. */
  children: ReactNode;
}) {
  const { t } = useTranslation("common");
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const { colors } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  if (bare) return <>{children}</>;

  const breakdown = computeEffectiveAmount(originalAmount, reimbursements);
  const money = (amount: number) => displayCurrency(formatCurrency(amount), hideValues);
  const hasReimbursements = Boolean(reimbursedBy) && breakdown.reimbursedTotal > 0;

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
        <Text style={[styles.title, { color: colors.text }]}>{t("transactions.paymentBreakdown.title")}</Text>
        <Ionicons name={collapsed ? "chevron-down" : "chevron-up"} size={18} color={colors.textSecondary} />
      </Pressable>

      {reimbursedBy ? (
      <View style={styles.tiles}>
        <SummaryTile label={t("transactions.paymentBreakdown.tilePaid")} value={money(breakdown.originalAmount)} />
        {hasReimbursements ? (
          <>
            <SummaryTile
              label={t("transactions.paymentBreakdown.tileReimbursed")}
              value={`−${money(breakdown.reimbursedTotal)}`}
            />
            <SummaryTile
              label={t("transactions.paymentBreakdown.tileEffective")}
              value={money(breakdown.effectiveAmount)}
              highlighted
            />
          </>
        ) : null}
      </View>
      ) : null}
      {hasReimbursements && breakdown.isOverReimbursed ? (
        <Badge label={t("transactions.reimbursements.overReimbursedBadge")} tone="success" />
      ) : null}

      {collapsed ? null : (
        <>
          {reimbursedBy ? (
            <View style={styles.group}>
              <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                {t("transactions.paymentBreakdown.reimbursementsGroup")}
              </Text>
              {reimbursedBy}
            </View>
          ) : null}
          <View style={[styles.group, reimbursedBy ? [styles.divided, { borderColor: colors.border }] : null]}>
            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
              {t(reimbursedBy ? "transactions.paymentBreakdown.costBearers" : "transactions.paymentBreakdown.paidFrom")}
            </Text>
            {children}
          </View>
        </>
      )}
    </View>
  );
}

function SummaryTile({ label, value, highlighted = false }: { label: string; value: string; highlighted?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: highlighted ? colors.primarySoft : colors.surfaceMuted },
      ]}
    >
      <Text style={{ color: highlighted ? colors.primary : colors.textSecondary, fontSize: 12 }}>{label}</Text>
      <Text
        style={{
          color: highlighted ? colors.primary : colors.text,
          fontSize: 15,
          fontWeight: highlighted ? "700" : "600",
        }}
      >
        {value}
      </Text>
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
  tiles: { flexDirection: "row", gap: spacing(1.5) },
  tile: {
    flex: 1,
    alignItems: "center",
    borderRadius: radius.md,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1),
    gap: spacing(0.5),
  },
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
});
