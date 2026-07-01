import { useMemo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";

import { useCreateTransaction } from "@/features/transactions/hooks/useCreateTransaction";
import { TransactionForm } from "@/features/transactions/components/transaction-form";
import { useAuthContext } from "@/shared/hooks/use-auth-context";
import { useAccounts } from "@/features/accounts/hooks";
import { useCategories } from "@/features/categories/hooks";
import { useSavingPots } from "@/features/saving-pots/hooks";
import { TransactionFormValues } from "@/features/transactions/transaction.schema";

import { colors, spacing } from "@/shared/theme";

export default function CreateTransactionScreen() {
  const { mutateAsync, isPending } = useCreateTransaction();
  const { householdId, profile } = useAuthContext();

  const { data: accounts, isPending: accountsLoading } = useAccounts();
  const { data: categories, isPending: categoriesLoading } = useCategories();
  const { data: pots = [] } = useSavingPots();

  const potOptions = useMemo(
    () => pots.map((p) => ({ id: p.id, label: p.name })),
    [pots]
  );

  const onSubmit = async (data: TransactionFormValues) => {
    if (!householdId) throw new Error("No household selected");
    if (!profile?.id) throw new Error("No authenticated user");

    await mutateAsync({
      account_id: data.account_id,
      category_id: data.category_id,
      pot_id: data.pot_id ?? null,
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TransactionForm
          loading={isPending}
          onSubmit={onSubmit}
          accounts={accounts ?? []}
          categories={categories ?? []}
          pots={potOptions}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});