// features/transactions/components/transaction-form.tsx
import { useState } from "react";
import { TextInput as NativeTextInput, useWindowDimensions, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Text } from "react-native-paper";

import {
  transactionSchema,
  TransactionFormInput,
  TransactionFormValues,
} from "../transaction.schema";
import { Select } from "@/shared/components/ui/Select";
import { DateField } from "@/shared/components/ui/DateField";
import { useI18n } from "@/shared/i18n";
import { colors, spacing } from "@/shared/theme";

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };
type PotOption = { id: string; label: string };

const POT_PREFIX = "pot__";

type TransactionFormProps = {
  loading?: boolean;
  onSubmit: (data: TransactionFormValues) => void | Promise<void>;
  defaultValues?: Partial<TransactionFormInput>;
  accounts: AccountOption[];
  categories: CategoryOption[];
  pots?: PotOption[];
};

export function TransactionForm({
  loading,
  onSubmit,
  defaultValues,
  accounts,
  categories,
  pots,
}: TransactionFormProps) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const useDesktopRow = width >= 960;

  const fieldGroupStyle = {
    gap: spacing.sm,
    flex: 1,
  } as const;

  const labelStyle = {
    fontWeight: "700" as const,
  };

  const inputStyle = {
    borderWidth: 3,
    borderColor: colors.text,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
    color: colors.text,
  } as const;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormInput, any, TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      account_id: accounts[0]?.id ?? "",
      category_id: null,
      pot_id: null,
      type: "expense",
      title: "",
      amount: 0,
      notes: null,
      date: new Date().toISOString().slice(0, 10),
      ...defaultValues,
    },
  });

  // Combined accounts + pots into one "source" dropdown.
  // Pot entries use POT_PREFIX so we can tell them apart.
  const [sourceId, setSourceId] = useState<string>(
    defaultValues?.account_id ?? accounts[0]?.id ?? ""
  );

  const sourceOptions = [
    ...accounts.map((a) => ({ id: a.id, label: a.name })),
    ...(pots ?? []).map((p) => ({
      id: `${POT_PREFIX}${p.id}`,
      label: `${p.label} \u2192 ${t("transactions.formPot")}`,
    })),
  ];

  const onSourceSelect = (id: string) => {
    setSourceId(id);
    if (id.startsWith(POT_PREFIX)) {
      const potId = id.slice(POT_PREFIX.length);
      setValue("pot_id", potId);
      setValue("type", "expense");
    } else {
      setValue("pot_id", null);
      setValue("account_id", id);
    }
  };

  // Derive account_id from sourceId when not a pot
  const resolvedAccountId = sourceId.startsWith(POT_PREFIX)
    ? accounts[0]?.id ?? ""
    : sourceId;

  const transactionTypes = [
    { id: "expense", label: t("transactions.formTypeExpense") },
    { id: "income", label: t("transactions.formTypeIncome") },
  ];

  return (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
      <Select
        label={t("transactions.formSource")}
        options={sourceOptions}
        selected={sourceId}
        onSelect={onSourceSelect}
      />

      {/* When a pot is chosen, still let user pick which account to debit */}
      {sourceId.startsWith(POT_PREFIX) && (
        <Controller
          control={control}
          name="account_id"
          render={({ field: { onChange, value } }) => (
            <Select
              label={t("transactions.formAccount")}
              placeholder={t("transactions.formAccountPlaceholder")}
              options={accounts.map((a) => ({ id: a.id, label: a.name }))}
              selected={value || resolvedAccountId}
              onSelect={onChange}
            />
          )}
        />
      )}

      <View style={{ flexDirection: useDesktopRow ? "row" : "column", gap: spacing.lg }}>
        <Controller
          control={control}
          name="type"
          render={({ field: { onChange, value } }) => (
            <Select
              label={t("transactions.formType")}
              options={transactionTypes}
              selected={value}
              onSelect={(v) => onChange(v as TransactionFormInput["type"])}
              error={errors.type?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="category_id"
          render={({ field: { onChange, value } }) => (
            <Select
              label={t("transactions.formCategory")}
              options={categories.map((c) => ({ id: c.id, label: c.name }))}
              selected={value ?? ""}
              onSelect={(v) => onChange(v === "" ? null : v)}
              nullable
              nullLabel={t("transactions.formCategoryNone")}
              error={errors.category_id?.message}
            />
          )}
        />
      </View>

      {/* Title */}
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={fieldGroupStyle}>
            <Text style={labelStyle}>{t("transactions.formTitle")}</Text>
            <NativeTextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={t("transactions.formTitle")}
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
            />
            {errors.title && <Text style={{ color: colors.danger, fontSize: 12 }}>{errors.title.message}</Text>}
          </View>
        )}
      />

      <View style={{ flexDirection: useDesktopRow ? "row" : "column", gap: spacing.lg }}>
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={fieldGroupStyle}>
              <Text style={labelStyle}>{t("transactions.formAmount")}</Text>
              <NativeTextInput
                value={String(value ?? "")}
                onChangeText={(v) => onChange(v === "" ? 0 : Number(v))}
                onBlur={onBlur}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={inputStyle}
              />
              {errors.amount && <Text style={{ color: colors.danger, fontSize: 12 }}>{errors.amount.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="date"
          render={({ field: { onChange, value } }) => (
            <DateField
              label={t("transactions.formDate")}
              value={value}
              onChange={onChange}
              error={errors.date?.message}
            />
          )}
        />
      </View>

      {/* Notes */}
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={fieldGroupStyle}>
            <Text style={labelStyle}>{t("transactions.formNotes")}</Text>
            <NativeTextInput
              value={value ?? ""}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={t("transactions.formNotes")}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                ...inputStyle,
                minHeight: 120,
                paddingTop: spacing.md,
              }}
            />
            {errors.notes && <Text style={{ color: colors.danger, fontSize: 12 }}>{errors.notes.message}</Text>}
          </View>
        )}
      />

      {/* Submit */}
      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
        loading={loading}
        style={{ marginTop: spacing.lg }}
      >
        {loading ? t("transactions.formSaving") : t("transactions.formSave")}
      </Button>
    </View>
  );
}