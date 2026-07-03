import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";
import Section from "@/shared/components/ui/Section";
import { useFormatters, useI18n } from "@/shared/i18n";
import { Text, View } from "react-native";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { colors, spacing } from "@/shared/theme";

export default function RecentTransactionsCard() {
  const { t } = useI18n();
  const { formatCurrency } = useFormatters();
  const { data: transactions = [] } = useTransactions({ limit: 5 });

  return (
    <Section title={t("dashboard.recentTransactionsTitle")}>
      <Card>
        {transactions.length === 0 ? (
          <EmptyState message={t("dashboard.noTransactions")} />
        ) : (
          <View style={{ gap: spacing.md }}>
            {transactions.map((tx) => {
              const amount = Number(tx.amount ?? 0);
              const signed = tx.type === "expense" ? -amount : amount;
              const accountName = tx.account?.name ?? t("transactions.accountFilter");

              return (
                <View
                  key={tx.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1, paddingRight: spacing.md }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }} numberOfLines={1}>
                      {tx.title}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                      {accountName}
                    </Text>
                  </View>

                  <Text style={{ color: signed < 0 ? colors.expense : colors.income, fontWeight: "800" }}>
                    {formatCurrency(signed, { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </Section>
  );
}