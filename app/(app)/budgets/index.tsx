import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, TextInput as NativeTextInput, View } from "react-native";
import { Text } from "react-native-paper";

import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";
import PageHeader from "@/shared/components/ui/PageHeader";
import Screen from "@/shared/components/ui/Screen";
import Section from "@/shared/components/ui/Section";
import { DateField } from "@/shared/components/ui/DateField";
import { Select } from "@/shared/components/ui/Select";
import { useCategories } from "@/features/categories/hooks";
import { useBudgetProgress, useBudgets, useCreateBudget, useDeleteBudget } from "@/features/budgets/hooks";
import { useFormatters, useI18n } from "@/shared/i18n";
import { useSession } from "@/shared/session";
import { colors, spacing } from "@/shared/theme";

type BudgetPeriod = "weekly" | "monthly" | "yearly";

function startOfPeriod(period: BudgetPeriod) {
  const now = new Date();
  if (period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day;
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  if (period === "yearly") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function endOfPeriod(period: BudgetPeriod) {
  const now = new Date();
  if (period === "weekly") {
    const start = startOfPeriod(period);
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  }
  if (period === "yearly") return new Date(now.getFullYear(), 11, 31);
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

export default function BudgetsScreen() {
  const { t } = useI18n();
  const { formatCurrency } = useFormatters();
  const { data: session } = useSession();
  const householdId = session?.household.id;
  const { data: categories = [], isPending: categoriesLoading } = useCategories("expense");
  const { data: budgets = [], isPending: budgetsLoading } = useBudgets();
  const { data: progress = [], isPending: progressLoading } = useBudgetProgress();
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();

  const [categoryId, setCategoryId] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [amount, setAmount] = useState("0");
  const [startDate, setStartDate] = useState(startOfPeriod("monthly").toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(endOfPeriod("monthly").toISOString().slice(0, 10));

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const progressByBudgetId = useMemo(
    () =>
      new Map(
        progress.map((item) => [
          item.id,
          {
            spent: Number(item.spent ?? 0),
            remaining: Number(item.remaining ?? 0),
          },
        ])
      ),
    [progress]
  );

  const onCreate = async () => {
    if (!householdId) return;
    if (!categoryId) throw new Error(t("budgets.missingCategory"));

    await createBudget.mutateAsync({
      household_id: householdId,
      category_id: categoryId,
      amount: Number(amount),
      period,
      start_date: startDate,
      end_date: endDate,
      created_by: session!.profile.id,
    });

    setAmount("0");
  };

  const onPeriodChange = (value: BudgetPeriod) => {
    setPeriod(value);
    setStartDate(startOfPeriod(value).toISOString().slice(0, 10));
    setEndDate(endOfPeriod(value).toISOString().slice(0, 10));
  };

  if (categoriesLoading || budgetsLoading || progressLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Screen>
      <PageHeader title={t("budgets.title")} subtitle={t("budgets.subtitle")} />

      <Section title={t("budgets.createTitle")}>
        <Card>
          <View style={{ gap: spacing.md }}>
            <Select
              label={t("budgets.category")}
              placeholder={t("budgets.chooseCategory")}
              options={categories.map((category) => ({ id: category.id, label: category.name }))}
              selected={categoryId}
              onSelect={setCategoryId}
            />

            <Select
              label={t("budgets.period")}
              options={[
                { id: "weekly", label: t("budgets.weekly") },
                { id: "monthly", label: t("budgets.monthly") },
                { id: "yearly", label: t("budgets.yearly") },
              ]}
              selected={period}
              onSelect={(value) => onPeriodChange(value as BudgetPeriod)}
            />

            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontWeight: "700" }}>{t("budgets.amount")}</Text>
              <NativeTextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={{
                  borderWidth: 3,
                  borderColor: colors.text,
                  backgroundColor: colors.surface,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  minHeight: 56,
                  color: colors.text,
                }}
              />
            </View>

            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <DateField label={t("budgets.startDate")} value={startDate} onChange={setStartDate} />
              <DateField label={t("budgets.endDate")} value={endDate} onChange={setEndDate} />
            </View>

            <Button
              title={t("budgets.create")}
              onPress={onCreate}
              loading={createBudget.isPending}
              disabled={!categoryId || createBudget.isPending}
            />
          </View>
        </Card>
      </Section>

      <Section title={t("budgets.currentTitle")}>
        {budgets.length === 0 ? (
          <EmptyState message={t("budgets.empty")} />
        ) : (
          budgets.map((budget) => {
            const progressItem = progressByBudgetId.get(budget.id);
            const categoryName = categoryNames.get(budget.category_id) ?? "Category";

            return (
              <Card key={budget.id}>
                <View style={{ gap: spacing.sm }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                    <Text style={{ fontWeight: "800", flex: 1 }}>{categoryName}</Text>
                    <Text>{t(`budgets.${budget.period}` as const)}</Text>
                  </View>
                  <Text>{t("budgets.budget", { value: formatCurrency(Number(budget.amount)) })}</Text>
                  <Text>{t("budgets.spent", { value: formatCurrency(progressItem?.spent ?? 0) })}</Text>
                  <Text>{t("budgets.remaining", { value: formatCurrency(progressItem?.remaining ?? Number(budget.amount)) })}</Text>
                  <Text>
                    {t("budgets.periodLabel", { from: budget.start_date, to: budget.end_date })}
                  </Text>
                  <Button
                    title={t("budgets.delete")}
                    variant="danger"
                    loading={deleteBudget.isPending}
                    onPress={() =>
                      Alert.alert(t("budgets.deleteTitle"), t("budgets.deleteMessage"), [
                        { text: t("common.cancel"), style: "cancel" },
                        { text: t("common.delete"), style: "destructive", onPress: () => deleteBudget.mutate(budget.id) },
                      ])
                    }
                  />
                </View>
              </Card>
            );
          })
        )}
      </Section>
    </Screen>
  );
}
