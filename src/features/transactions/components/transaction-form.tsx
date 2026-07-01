// features/transactions/components/transaction-form.tsx
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
import { colors, spacing } from "@/shared/theme";

const TRANSACTION_TYPES: { label: string; value: TransactionFormInput["type"] }[] = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
];

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };

type TransactionFormProps = {
  loading?: boolean;
  onSubmit: (data: TransactionFormValues) => void | Promise<void>;
  defaultValues?: Partial<TransactionFormInput>;
  accounts: AccountOption[];
  categories: CategoryOption[];
};

export function TransactionForm({
  loading,
  onSubmit,
  defaultValues,
  accounts,
  categories,
}: TransactionFormProps) {
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
    formState: { errors },
  } = useForm<TransactionFormInput, any, TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      account_id: accounts[0]?.id ?? "",
      category_id: null,
      type: "expense",
      title: "",
      amount: 0,
      notes: null,
      date: new Date().toISOString().slice(0, 10),
      ...defaultValues,
    },
  });

  return (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
      <View
        style={{
          flexDirection: useDesktopRow ? "row" : "column",
          gap: spacing.lg,
        }}
      >
        <Controller
          control={control}
          name="type"
          render={({ field: { onChange, value } }) => (
            <Select
              label="Type"
              options={TRANSACTION_TYPES.map((t) => ({ id: t.value, label: t.label }))}
              selected={value}
              onSelect={(v) => onChange(v as TransactionFormInput["type"])}
              error={errors.type?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="account_id"
          render={({ field: { onChange, value } }) => (
            <Select
              label="Account"
              placeholder="Select account"
              options={accounts.map((a) => ({ id: a.id, label: a.name }))}
              selected={value}
              onSelect={onChange}
              error={errors.account_id?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="category_id"
          render={({ field: { onChange, value } }) => (
            <Select
              label="Category"
              options={categories.map((c) => ({ id: c.id, label: c.name }))}
              selected={value ?? ""}
              onSelect={(v) => onChange(v === "" ? null : v)}
              nullable
              nullLabel="Uncategorized"
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
            <Text style={labelStyle}>Title</Text>
            <NativeTextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Title"
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
              <Text style={labelStyle}>Amount</Text>
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
              label="Date"
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
            <Text style={labelStyle}>Notes</Text>
            <NativeTextInput
              value={value ?? ""}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Notes"
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
        {loading ? "Saving..." : "Save"}
      </Button>
    </View>
  );
}