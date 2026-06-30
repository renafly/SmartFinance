import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { TransactionCard } from "@/features/transactions/components/transaction-card";

import Button from "@/shared/components/ui/Button";
import { colors, spacing, typography } from "@/shared/theme";

export default function TransactionsScreen() {
  const { data: transactions, isPending, error } = useTransactions();

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{String(error)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transactions</Text>

      <Button
        title="+ New Transaction"
        onPress={() => router.push("/transactions/new")}
      />

      <View style={styles.list}>
        {transactions?.map((transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            onPress={() => router.push(`/transactions/${transaction.id}`)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    ...typography.h2,
    color: colors.text,
  },

  list: {
    gap: spacing.md,
  },

  errorText: {
    ...typography.body,
    color: colors.danger,
  },
});