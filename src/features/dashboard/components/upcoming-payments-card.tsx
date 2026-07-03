import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";
import Section from "@/shared/components/ui/Section";
import { useFormatters, useI18n } from "@/shared/i18n";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { Text, View } from "react-native";
import { colors, spacing } from "@/shared/theme";

function todayISO(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function UpcomingPaymentsCard() {
  const { t } = useI18n();
  const { formatCurrency, formatDate } = useFormatters();
  const { data: transactions = [] } = useTransactions({ from: todayISO() });

  const upcoming = [...transactions]
    .filter((tx) => tx.type === "expense")
    .sort(
      (a, b) =>
        new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    )
    .slice(0, 5);

  return (
    <Section title={t("dashboard.upcomingPaymentsTitle")}>
      <Card>
        {upcoming.length === 0 ? (
          <EmptyState message={t("dashboard.noUpcomingPayments")} />
        ) : (
          <View style={{ gap: spacing.md }}>
            {upcoming.map((tx) => (
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
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {formatDate(tx.transaction_date)}
                  </Text>
                </View>
                <Text style={{ color: colors.expense, fontWeight: "800" }}>
                  {formatCurrency(Number(tx.amount ?? 0), { maximumFractionDigits: 0 })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Section>
  );
}