import { ActivityIndicator, View } from "react-native";
import { Text } from "react-native-paper";

import Card from "@/shared/components/ui/Card";
import Section from "@/shared/components/ui/Section";
import { useSavingPotBalances } from "@/features/saving-pots/hooks";
import { useFormatters, useI18n } from "@/shared/i18n";
import { colors, spacing } from "@/shared/theme";

export default function BudgetsCard() {
  const { t } = useI18n();
  const { formatCurrency } = useFormatters();
  const { data = [], isPending } = useSavingPotBalances();

  return (
    <Section title={t("dashboard.savingsTitle")}>
      <Card>
        {isPending ? (
          <ActivityIndicator />
        ) : data.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>{t("dashboard.noSavings")}</Text>
        ) : (
          <View style={{ gap: spacing.md }}>
            {data.slice(0, 3).map((pot) => (
              <View key={pot.id} style={{ gap: spacing.xs }}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{pot.name}</Text>
                <Text style={{ color: colors.text }}>{t("dashboard.savingsBalance", { balance: formatCurrency(Number(pot.balance)) })}</Text>
                {pot.target_amount ? (
                  <Text style={{ color: colors.textMuted }}>
                    {t("dashboard.savingsTarget", { target: formatCurrency(Number(pot.target_amount)) })}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </Card>
    </Section>
  );
}