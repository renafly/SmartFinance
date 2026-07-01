import { StyleSheet, View } from "react-native";

import StatCard from "@/shared/components/ui/StatCard";
import { useAccounts } from "@/features/accounts/hooks";
import { useFormatters, useI18n } from "@/shared/i18n";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";

export default function DashboardStats() {
  const { t } = useI18n();
  const { formatCurrency } = useFormatters();
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.initial_balance ?? 0), 0);

  const income = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount ?? 0), 0);

  const expenses = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Number(tx.amount ?? 0), 0);

  const savingsBalance = accounts
    .filter((a) => a.type === "savings" || a.type === "investment")
    .reduce((sum, a) => sum + Number(a.initial_balance ?? 0), 0);

  return (
    <View style={styles.container}>
      <StatCard title={t("dashboard.totalBalance")} value={formatCurrency(totalBalance, { maximumFractionDigits: 0 })} />
      <StatCard title={t("dashboard.income")} value={formatCurrency(income, { maximumFractionDigits: 0 })} />
      <StatCard title={t("dashboard.expenses")} value={formatCurrency(expenses, { maximumFractionDigits: 0 })} />
      <StatCard title={t("dashboard.savings")} value={formatCurrency(savingsBalance, { maximumFractionDigits: 0 })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 30,
  },
});