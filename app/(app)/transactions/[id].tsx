
import { useMemo } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { TransactionForm } from "@/features/transactions/components/transaction-form";
import { useTransaction } from "@/features/transactions/hooks/useTransactions";
import { useUpdateTransaction } from "@/features/transactions/hooks/useUpdateTransaction";
import { useDeleteTransaction } from "@/features/transactions/hooks/useDeleteTransaction";
import { useAccounts } from "@/features/accounts/hooks";
import { useCategories } from "@/features/categories/hooks";
import { useSavingPots } from "@/features/saving-pots/hooks";

import Button from "@/shared/components/ui/Button";
import { useI18n } from "@/shared/i18n";
import {
  colors,
  spacing,
  typography,
  radius,
} from "@/shared/theme";

export default function EditTransactionScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: transaction, isPending } = useTransaction(id);
  const { data: accounts, isPending: accountsLoading } = useAccounts();
  const { data: categories, isPending: categoriesLoading } = useCategories();
  const { data: pots = [] } = useSavingPots();

  const potOptions = useMemo(
    () => pots.map((p) => ({ id: p.id, label: p.name })),
    [pots]
  );

  const update = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  if (isPending || accountsLoading || categoriesLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!transaction) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("transactions.editTitle")}</Text>

      <View style={styles.card}>
        <TransactionForm
          defaultValues={{
            account_id: transaction.account_id,
            category_id: transaction.category_id,
            pot_id: transaction.pot_id,
            type: transaction.type,
            title: transaction.title,
            amount: transaction.amount,
            notes: transaction.notes,
            date: transaction.transaction_date,
          }}
          loading={update.isPending}
          accounts={accounts ?? []}
          categories={categories ?? []}
          pots={potOptions}
          onSubmit={async (data) => {
            await update.mutateAsync({
              id,
              data: {
                account_id: data.account_id,
                category_id: data.category_id,
                pot_id: data.pot_id ?? null,
                type: data.type,
                title: data.title,
                amount: data.amount,
                notes: data.notes,
                transaction_date: data.date,
              },
            });

            router.back();
          }}
        />
      </View>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>{t("transactions.dangerZone")}</Text>

        <Button
          title={t("transactions.delete")}
          variant="danger"
          loading={deleteMutation.isPending}
          onPress={() =>
            Alert.alert(
              t("transactions.deleteTitle"),
              t("transactions.deleteMessage"),
              [
                {
                  text: t("common.cancel"),
                  style: "cancel",
                },
                {
                  text: t("common.delete"),
                  style: "destructive",
                  onPress: async () => {
                    await deleteMutation.mutateAsync(id);
                    router.back();
                  },
                },
              ]
            )
          }
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },

  dangerZone: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: "#FFE8E8",
    gap: spacing.md,
  },

  dangerTitle: {
    ...typography.h4,
    color: colors.danger,
  },
});