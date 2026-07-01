import { ActivityIndicator, View } from "react-native";
import { Text } from "react-native-paper";

import Card from "@/shared/components/ui/Card";
import Section from "@/shared/components/ui/Section";
import { useCategories } from "@/features/categories/hooks";
import { useBudgetProgress } from "@/features/budgets/hooks";
import { useFormatters, useI18n } from "@/shared/i18n";
import { colors, spacing } from "@/shared/theme";

export default function BudgetsCard() {
  const { t } = useI18n();
  const { formatCurrency } = useFormatters();
  const { data = [], isPending } = useBudgetProgress();
  const { data: categories = [] } = useCategories("expense");

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <Section title={t("dashboard.budgetsTitle")}>
      <Card>
        {isPending ? (
          <ActivityIndicator />
        ) : data.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>{t("dashboard.noBudgets")}</Text>
        ) : (
          <View style={{ gap: spacing.md }}>
            {data.slice(0, 3).map((budget) => (
              <View key={budget.id} style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                  <Text style={{ color: colors.text, fontWeight: "700", flex: 1 }}>
                    {categoryNames.get(budget.category_id) ?? budget.category ?? "Category"}
                  </Text>
                  <Text style={{ color: colors.textMuted }}>{t(`budgets.${budget.period}` as const)}</Text>
                </View>
                <Text style={{ color: colors.text }}>{t("dashboard.spentOf", { spent: formatCurrency(Number(budget.spent)), budget: formatCurrency(Number(budget.budget)) })}</Text>
                <Text style={{ color: colors.textMuted }}>{t("dashboard.remaining", { remaining: formatCurrency(Number(budget.remaining)) })}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Section>
  );
}