import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { AccountForm } from "@/features/accounts/components";
import { useAccount } from "@/features/accounts/hooks/useAccounts";
import { useUpdateAccount } from "@/features/accounts/hooks/useUpdateAccount";
import { useDeleteAccount } from "@/features/accounts/hooks/useDeleteAccount";

import Button from "@/shared/components/ui/Button";
import { useI18n } from "@/shared/i18n";
import {
  colors,
  spacing,
  typography,
  radius,
} from "@/shared/theme";

export default function EditAccountScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: account, isPending } = useAccount(id);

  const update = useUpdateAccount();
  const deleteMutation = useDeleteAccount();

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!account) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("accounts.editTitle")}</Text>

      <View style={styles.card}>
        <AccountForm
          defaultValues={{
            name: account.name,
            type: account.type,
            currency: account.currency,
            initial_balance: account.initial_balance,
          }}
          loading={update.isPending}
          onSubmit={async (data) => {
            await update.mutateAsync({
              id,
              data,
            });

            router.back();
          }}
        />
      </View>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>{t("accounts.dangerZone")}</Text>

        <Button
          title={t("accounts.delete")}
          variant="danger"
          loading={deleteMutation.isPending}
          onPress={() =>
            Alert.alert(
              t("accounts.deleteTitle"),
              t("accounts.deleteMessage"),
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