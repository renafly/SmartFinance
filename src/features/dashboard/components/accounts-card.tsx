import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";
import Section from "@/shared/components/ui/Section";
import { useAccounts } from "@/features/accounts/hooks";
import { useFormatters, useI18n } from "@/shared/i18n";
import { Text, View } from "react-native";
import { colors, spacing } from "@/shared/theme";

export default function AccountsCard() {
  const { t } = useI18n();
  const { formatCurrency } = useFormatters();
  const { data: accounts = [] } = useAccounts();

  return (
    <Section title={t("dashboard.accountsTitle")}>
      <Card>
        {accounts.length === 0 ? (
          <EmptyState message={t("dashboard.noAccounts")} />
        ) : (
          <View style={{ gap: spacing.md }}>
            {accounts.slice(0, 5).map((account) => (
              <View
                key={account.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>{account.name}</Text>
                <Text style={{ color: colors.text }}>{formatCurrency(Number(account.initial_balance ?? 0), { maximumFractionDigits: 0 })}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Section>
  );
}