import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { useCreateTransaction } from "@/features/transactions/hooks/useCreateTransaction";
import { TransactionForm } from "@/features/transactions/components/transaction-form";
import { useAuthContext } from "@/shared/hooks/use-auth-context";
import { useAccounts } from "@/features/accounts/hooks";
import { useCategories } from "@/features/categories/hooks";
import { TransactionFormValues } from "@/features/transactions/transaction.schema";

import { colors, spacing, typography, radius } from "@/shared/theme";

export default function CreateTransactionScreen() {
  const { mutateAsync, isPending } = useCreateTransaction();
  const { householdId, profile } = useAuthContext();

  const { data: accounts, isPending: accountsLoading } = useAccounts();
  const { data: categories, isPending: categoriesLoading } = useCategories();

  const onSubmit = async (data: TransactionFormValues) => {
    if (!householdId) {
      throw new Error("No household selected");
    }

    if (!profile?.id) {
      throw new Error("No authenticated user");
    }

    await mutateAsync({
      account_id: data.account_id,
      category_id: data.category_id,
      type: data.type,
      title: data.title,
      amount: data.amount,
      notes: data.notes,
      transaction_date: data.date,
      household_id: householdId,
      created_by: profile.id,
    });

    router.back();
  };

  if (accountsLoading || categoriesLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Transaction</Text>

      <View style={styles.card}>
        <TransactionForm
          loading={isPending}
          onSubmit={onSubmit}
          accounts={accounts ?? []}
          categories={categories ?? []}
        />
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

  card: {
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.text,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});