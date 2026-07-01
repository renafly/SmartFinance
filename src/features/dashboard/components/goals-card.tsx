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

function monthStartISO(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export default function GoalsCard() {
  const { t } = useI18n();
  const { formatCurrency } = useFormatters();
  const { data: transactions = [] } = useTransactions({
    type: "expense",
    from: monthStartISO(),
    to: todayISO(),
  });

  const byCategory = new Map<string, number>();

  transactions.forEach((tx) => {
    const key = tx.category?.name ?? t("dashboard.uncategorized");
    const current = byCategory.get(key) ?? 0;
    byCategory.set(key, current + Number(tx.amount ?? 0));
  });

  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <Section title={t("dashboard.goalsTitle")}>
      <Card>
        {topCategories.length === 0 ? (
          <EmptyState message={t("dashboard.noExpenseData")} />
        ) : (
          <View style={{ gap: spacing.md }}>
            {topCategories.map(([name, amount]) => (
              <View
                key={name}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>{name}</Text>
                <Text style={{ color: colors.expense, fontWeight: "800" }}>{formatCurrency(amount, { maximumFractionDigits: 0 })}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Section>
  );
}