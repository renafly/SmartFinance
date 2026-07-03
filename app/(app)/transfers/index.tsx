import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import Screen from "@/shared/components/ui/Screen";
import PageHeader from "@/shared/components/ui/PageHeader";
import { TransferForm } from "@/features/transfers/components/transfer-form";
import { useCreateTransfer } from "@/features/transfers/hooks";
import { useAccounts } from "@/features/accounts/hooks";
import { useCategories } from "@/features/categories/hooks";
import { useI18n } from "@/shared/i18n";
import { useSession } from "@/shared/session";
import { colors, spacing } from "@/shared/theme";

export default function TransfersScreen() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const { data: accounts = [], isPending: accountsLoading } = useAccounts();
  const { data: accountCategories = [], isPending: categoriesLoading } = useCategories("account");
  const createTransfer = useCreateTransfer();

  if (accountsLoading || categoriesLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Screen>
      <PageHeader title={t("transfers.title")} subtitle={t("transfers.subtitle")} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TransferForm
            accounts={accounts ?? []}
            categories={accountCategories}
            loading={createTransfer.isPending}
            onSubmit={async (data) => {
              if (!session?.household.id) throw new Error("No household selected");
              if (!session.profile?.id) throw new Error("No authenticated user");

              await createTransfer.mutateAsync({
                householdId: session.household.id,
                fromAccountId: data.fromAccountId,
                toAccountId: data.toAccountId,
                amount: data.amount,
                categoryId: data.categoryId ?? null,
                title: data.title,
                notes: data.notes ?? undefined,
                transactionDate: data.transactionDate,
                createdBy: session.profile.id,
              });

              router.back();
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
});