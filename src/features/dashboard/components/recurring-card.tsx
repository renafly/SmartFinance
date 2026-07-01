import { ActivityIndicator, View } from "react-native";
import { Text } from "react-native-paper";

import Card from "@/shared/components/ui/Card";
import Section from "@/shared/components/ui/Section";
import { useAccounts } from "@/features/accounts/hooks";
import { useCategories } from "@/features/categories/hooks";
import { useFormatters, useI18n } from "@/shared/i18n";
import { useRecurringTransactions } from "@/features/recurring-transactions/hooks";
import { colors, spacing } from "@/shared/theme";

export default function RecurringCard() {
  const { t } = useI18n();
  const { formatDate } = useFormatters();
  const { data = [], isPending } = useRecurringTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();

  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <Section title={t("dashboard.recurringTitle")}>
      <Card>
        {isPending ? (
          <ActivityIndicator />
        ) : data.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>{t("dashboard.noRecurring")}</Text>
        ) : (
          <View style={{ gap: spacing.md }}>
            {data.slice(0, 3).map((rule) => (
              <View key={rule.id} style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                  <Text style={{ color: colors.text, fontWeight: "700", flex: 1 }}>{rule.title}</Text>
                  <Text style={{ color: rule.is_active ? colors.success : colors.textMuted }}>
                    {rule.is_active ? t("dashboard.active") : t("dashboard.paused")}
                  </Text>
                </View>
                <Text style={{ color: colors.text }}>{Number(rule.amount ?? 0).toFixed(2)} · {String(rule.type).toUpperCase()}</Text>
                <Text style={{ color: colors.textMuted }}>
                  {accountNames.get(rule.account_id) ?? t("transactions.accountFilter")} · {rule.category_id ? categoryNames.get(rule.category_id) ?? t("categories.title") : t("dashboard.uncategorized")}
                </Text>
                <Text style={{ color: colors.textMuted }}>
                  {rule.frequency} · {t("dashboard.nextRun")} {formatDate(rule.next_run)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Section>
  );
}