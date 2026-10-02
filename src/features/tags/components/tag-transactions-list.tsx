import { ActivityIndicator, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Table, TableCell, TableRow } from "@/components/data-surface";
import { formatCurrency, formatDate } from "@/components/migrated-page";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { useResponsiveMetrics } from "@/theme/responsive";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

import { useTagTransactions } from "../hooks/useTags";
import type { TagPeriodRange } from "../types";

type TagTransactionsListProps = {
  tagId: string;
  range: TagPeriodRange;
  hideValues: boolean;
};

/**
 * The expanded "details" of a tag: every tagged expense in the selected
 * period. Uses the shared data-surface Table, which renders as a header +
 * rows on desktop/web and as stacked, labelled cards on phones -- the same
 * component the Transactions list is built on.
 */
export function TagTransactionsList({ tagId, range, hideValues }: TagTransactionsListProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const query = useTagTransactions(tagId, range);

  const mutedText = {
    color: colors.textSecondary,
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  };

  if (query.isLoading) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(2), paddingVertical: spacing(2) }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={mutedText}>{t("tags.details.loading")}</Text>
      </View>
    );
  }

  if (query.isError) {
    return (
      <Text style={[mutedText, { color: colors.destructive }]} accessibilityLiveRegion="polite">
        {t("tags.details.loadError")}
      </Text>
    );
  }

  const transactions = query.data ?? [];
  if (transactions.length === 0) {
    return <Text style={mutedText}>{t("tags.details.empty")}</Text>;
  }

  return (
    <Table
      columns={[
        { label: t("tags.details.description"), flex: 1.6 },
        { label: t("tags.details.date"), flex: 0.8 },
        { label: t("tags.details.category"), flex: 1 },
        { label: t("tags.details.account"), flex: 1 },
        { label: t("tags.details.person"), flex: 0.9 },
        { label: t("tags.details.amount"), flex: 0.9, align: "right" },
      ]}
    >
      {transactions.map((transaction) => (
        <TableRow key={transaction.id}>
          {[
            <TableCell key="title" flex={1.6} mobileColumnIndex={0}>
              <View style={{ gap: spacing(0.5), paddingRight: responsive.isPhone ? spacing(18) : 0 } as any}>
                <Text
                  numberOfLines={1}
                  style={{ color: colors.text, fontWeight: typography.fontWeight.semibold as any, fontSize: typography.fontSize[13] }}
                >
                  {transaction.title}
                </Text>
                {transaction.notes ? (
                  <Text numberOfLines={1} style={mutedText}>
                    {transaction.notes}
                  </Text>
                ) : null}
              </View>
            </TableCell>,
            <TableCell key="date" flex={0.8} muted mobileLabel={t("tags.details.date")}>
              {formatDate(transaction.date)}
            </TableCell>,
            <TableCell key="category" flex={1} muted mobileLabel={t("tags.details.category")}>
              {transaction.categoryName ?? t("tags.details.uncategorized")}
            </TableCell>,
            <TableCell key="account" flex={1} muted mobileLabel={t("tags.details.account")}>
              {transaction.isSplit
                ? t("tags.details.split")
                : (transaction.accountName ?? t("tags.details.unknown"))}
            </TableCell>,
            <TableCell key="person" flex={0.9} muted mobileLabel={t("tags.details.person")}>
              {transaction.createdByName ?? t("tags.details.unknown")}
            </TableCell>,
            <TableCell key="amount" flex={0.9} align="right" mobilePinned>
              <View style={{ alignItems: "flex-end", gap: spacing(0.5) }}>
                <Text
                  style={{ color: colors.text, fontWeight: typography.fontWeight.semibold as any, fontSize: typography.fontSize[13] }}
                >
                  {displayCurrency(formatCurrency(transaction.netAmount), hideValues)}
                </Text>
                {transaction.reimbursedTotal > 0 ? (
                  <Text style={[mutedText, { fontSize: typography.fontSize[12] }]}>
                    {t("tags.details.reimbursed", {
                      amount: displayCurrency(formatCurrency(transaction.reimbursedTotal), hideValues),
                    })}
                  </Text>
                ) : null}
              </View>
            </TableCell>,
          ]}
        </TableRow>
      ))}
    </Table>
  );
}
