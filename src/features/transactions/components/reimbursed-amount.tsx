import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { radius } from "@/theme/radius";
import { typography } from "@/theme/typography";
import { getReimbursementDisplay } from "@/features/transactions/utils/reimbursements";

/**
 * Amount cell for an expense that has reimbursements, in the transaction
 * list. The list is a cash view -- each account reimbursement is already
 * its own income row (20260929000000_reimbursement_income_transactions.sql)
 * and the running balance reflects the full outflow -- so the original
 * amount stays the primary value. One compact line underneath explains
 * the rest without growing the row:
 *
 *   partial  -12,00 €
 *            [↩ 3,00 €]  Net cost 9,00 €
 *   full     -12,00 €
 *            [✓ Fully reimbursed]
 *   over     -12,00 €
 *            [↩ 15,00 €]  Net gain 3,00 €
 *
 * The full Paid / Reimbursed / Effective breakdown stays one tap away in
 * the transaction details (PaymentBreakdownSection). Money formatting
 * (including the privacy mask) is the caller's, via `formatAmount`.
 */
export function ReimbursedAmount({
  originalAmount,
  reimbursedTotal,
  amountLabel,
  amountColor,
  amountStyle,
  formatAmount,
}: {
  originalAmount: number;
  reimbursedTotal: number;
  /** The primary amount exactly as the row would show it without reimbursements (sign included). */
  amountLabel: string;
  amountColor: string;
  amountStyle: StyleProp<TextStyle>;
  formatAmount: (amount: number) => string;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const display = getReimbursementDisplay(originalAmount, reimbursedTotal);

  const amountText = <Text style={[amountStyle, { color: amountColor }]}>{amountLabel}</Text>;
  if (display.status === "none") return amountText;

  const reimbursed = formatAmount(display.reimbursedTotal);
  const accessibilityLabel =
    display.status === "full"
      ? t("transactions.reimbursements.listA11yFull", { original: amountLabel })
      : display.status === "over"
        ? t("transactions.reimbursements.listA11yOver", {
            original: amountLabel,
            reimbursed,
            surplus: formatAmount(display.surplusAmount),
          })
        : t("transactions.reimbursements.listA11yPartial", {
            original: amountLabel,
            reimbursed,
            net: formatAmount(display.effectiveAmount),
          });

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={styles.container}
    >
      {amountText}
      <View style={styles.detailRow}>
        <View
          style={[
            styles.chip,
            { backgroundColor: colors.successSoft, borderColor: colors.success },
          ]}
        >
          <Ionicons
            name={display.status === "full" ? "checkmark-done" : "return-down-back"}
            size={12}
            color={colors.success}
          />
          <Text style={[styles.chipLabel, { color: colors.success }]} numberOfLines={1}>
            {display.status === "full"
              ? t("transactions.reimbursements.listFull")
              : reimbursed}
          </Text>
        </View>
        {display.status === "partial" ? (
          <Text style={[styles.netText, { color: colors.textSecondary }]} numberOfLines={1}>
            {t("transactions.reimbursements.listNetCost")}{" "}
            <Text style={[styles.netValue, { color: colors.text }]}>
              {formatAmount(display.effectiveAmount)}
            </Text>
          </Text>
        ) : display.status === "over" ? (
          <Text style={[styles.netText, { color: colors.textSecondary }]} numberOfLines={1}>
            {t("transactions.reimbursements.listNetGain")}{" "}
            <Text style={[styles.netValue, { color: colors.success }]}>
              {formatAmount(display.surplusAmount)}
            </Text>
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    gap: spacing(0.5),
  },
  detailRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    columnGap: spacing(1),
    rowGap: spacing(0.5),
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.5),
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.25),
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
    fontWeight: String(typography.fontWeight.extraBold) as TextStyle["fontWeight"],
  },
  netText: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  netValue: {
    fontWeight: String(typography.fontWeight.bold) as TextStyle["fontWeight"],
  },
});
