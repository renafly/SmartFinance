import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { useAccounts } from "@/features/accounts/hooks";
import { AccountCard } from "@/features/accounts/components/account-card";
import Button from "@/shared/components/ui/Button";
import { useI18n } from "@/shared/i18n";
import { colors, spacing, typography } from "@/shared/theme";

export default function AccountsScreen() {
  const { t } = useI18n();
  const { data: accounts, isPending, error } = useAccounts();

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
      <Text style={styles.title}>{t("accounts.title")}</Text>

      <Button
        title={t("accounts.new")}
        onPress={() => router.push("/accounts/new")}
      />

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {accounts?.length === 0 ? (
          <Text style={styles.empty}>{t("accounts.empty")}</Text>
        ) : (
          accounts?.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onPress={() => router.push(`/accounts/${account.id}`)}
            />
          ))
        )}
      </ScrollView>
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
    paddingBottom: spacing.lg,
  },

  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },

  errorText: {
    ...typography.body,
    color: colors.danger,
  },
});