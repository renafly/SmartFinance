import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, TextInput as NativeTextInput, View } from "react-native";
import { Text } from "react-native-paper";

import Card from "@/shared/components/ui/Card";
import Screen from "@/shared/components/ui/Screen";
import PageHeader from "@/shared/components/ui/PageHeader";
import Section from "@/shared/components/ui/Section";
import EmptyState from "@/shared/components/ui/EmptyState";
import Button from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Select";
import { DateField } from "@/shared/components/ui/DateField";
import { useAccounts } from "@/features/accounts/hooks";
import { useCategories } from "@/features/categories/hooks";
import { useFormatters, useI18n } from "@/shared/i18n";
import { useSession } from "@/shared/session";
import { useCreateRecurringTransaction, useDeleteRecurringTransaction, useRecurringTransactions, useToggleRecurringTransaction } from "@/features/recurring-transactions/hooks";
import { colors, spacing } from "@/shared/theme";

type Frequency = "daily" | "weekly" | "monthly" | "yearly";
type TransactionType = "income" | "expense";

export default function RecurringScreen() {
  const { t } = useI18n();
  const { formatCurrency, formatDate } = useFormatters();
  const { data: session } = useSession();
  const householdId = session?.household.id;
  const { data: accounts = [], isPending: accountsLoading } = useAccounts();
  const { data: categories = [], isPending: categoriesLoading } = useCategories();
  const { data: recurring = [], isPending: recurringLoading } = useRecurringTransactions();
  const createRecurring = useCreateRecurringTransaction();
  const toggleRecurring = useToggleRecurringTransaction();
  const deleteRecurring = useDeleteRecurringTransaction();

  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("0");
  const [type, setType] = useState<TransactionType>("expense");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [nextRun, setNextRun] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type]
  );

  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts]
  );

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const onCreate = async () => {
    if (!householdId) return;
    if (!accountId) throw new Error(t("recurring.missingAccount"));

    await createRecurring.mutateAsync({
      household_id: householdId,
      account_id: accountId,
      category_id: categoryId || null,
      title,
      notes: notes || null,
      amount: Number(amount),
      type,
      frequency,
      next_run: nextRun,
      created_by: session!.profile.id,
    });

    setTitle("");
    setNotes("");
    setAmount("0");
  };

  if (accountsLoading || categoriesLoading || recurringLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Screen>
      <PageHeader title={t("recurring.title")} subtitle={t("recurring.subtitle")} />

      <Section title={t("recurring.createTitle")}>
        <Card>
          <View style={{ gap: spacing.md }}>
            <Select
              label={t("recurring.account")}
              options={accounts.map((account) => ({ id: account.id, label: account.name }))}
              selected={accountId}
              onSelect={setAccountId}
            />
            <Select
              label={t("recurring.type")}
              options={[
                { id: "expense", label: t("categories.expense") },
                { id: "income", label: t("categories.income") },
              ]}
              selected={type}
              onSelect={(value) => {
                setType(value as TransactionType);
                setCategoryId("");
              }}
            />
            <Select
              label={t("recurring.category")}
              nullable
              nullLabel={t("recurring.uncategorized")}
              options={filteredCategories.map((category) => ({ id: category.id, label: category.name }))}
              selected={categoryId}
              onSelect={setCategoryId}
            />
            <Select
              label={t("recurring.frequency")}
              options={[
                { id: "daily", label: "Daily" },
                { id: "weekly", label: t("common.weekly") },
                { id: "monthly", label: t("common.monthly") },
                { id: "yearly", label: t("common.yearly") },
              ]}
              selected={frequency}
              onSelect={(value) => setFrequency(value as Frequency)}
            />
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontWeight: "700" }}>{t("recurring.titleLabel")}</Text>
              <NativeTextInput value={title} onChangeText={setTitle} placeholder={t("recurring.placeholderTitle")} placeholderTextColor={colors.textMuted} style={{ borderWidth: 3, borderColor: colors.text, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 56, color: colors.text }} />
            </View>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontWeight: "700" }}>{t("recurring.amount")}</Text>
              <NativeTextInput value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} style={{ borderWidth: 3, borderColor: colors.text, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 56, color: colors.text }} />
            </View>
            <DateField label={t("recurring.nextRun")} value={nextRun} onChange={setNextRun} />
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontWeight: "700" }}>{t("recurring.notes")}</Text>
              <NativeTextInput value={notes} onChangeText={setNotes} multiline numberOfLines={4} placeholder={t("recurring.placeholderNotes")} placeholderTextColor={colors.textMuted} style={{ borderWidth: 3, borderColor: colors.text, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 120, color: colors.text, textAlignVertical: "top" }} />
            </View>
            <Button title={t("recurring.create")} onPress={onCreate} loading={createRecurring.isPending} disabled={createRecurring.isPending || !accountId || !title.trim()} />
          </View>
        </Card>
      </Section>

      <Section title={t("recurring.rulesTitle")}>
        {recurring.length === 0 ? (
          <EmptyState message={t("recurring.empty")} />
        ) : (
          recurring.map((rule) => (
            <Card key={rule.id}>
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                  <Text style={{ fontWeight: "800", flex: 1 }}>{rule.title}</Text>
                  <Text>{rule.is_active ? t("recurring.active") : t("recurring.paused")}</Text>
                </View>
                <Text>{t("recurring.amountLabel", { value: formatCurrency(Number(rule.amount ?? 0)) })}</Text>
                <Text>{t("recurring.accountLabel", { value: accountNames.get(rule.account_id) ?? t("transactions.accountFilter") })}</Text>
                <Text>{t("recurring.typeLabel", { value: t(`categories.${rule.type}` as const) })}</Text>
                <Text>{t("recurring.categoryLabel", { value: rule.category_id ? categoryNames.get(rule.category_id) ?? t("categories.title") : t("recurring.uncategorized") })}</Text>
                <Text>{t("recurring.nextRunLabel", { value: formatDate(rule.next_run) || t("recurring.noDate") })}</Text>
                <Text>{t("recurring.frequencyLabel", { value: rule.frequency })}</Text>
                <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                  <Button
                    title={rule.is_active ? t("recurring.pause") : t("recurring.resume")}
                    variant="secondary"
                    loading={toggleRecurring.isPending}
                    onPress={() => toggleRecurring.mutate({ id: rule.id, active: !rule.is_active })}
                  />
                  <Button
                    title={t("recurring.delete")}
                    variant="danger"
                    loading={deleteRecurring.isPending}
                    onPress={() => Alert.alert(t("recurring.deleteTitle"), t("recurring.deleteMessage"), [
                      { text: t("common.cancel"), style: "cancel" },
                      { text: t("common.delete"), style: "destructive", onPress: () => deleteRecurring.mutate(rule.id) },
                    ])}
                  />
                </View>
              </View>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}
