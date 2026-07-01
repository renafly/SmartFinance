import { useWindowDimensions, View, TextInput as NativeTextInput } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Text } from "react-native-paper";
import { z } from "zod";

import { Select } from "@/shared/components/ui/Select";
import { DateField } from "@/shared/components/ui/DateField";
import { useI18n } from "@/shared/i18n";
import { colors, spacing } from "@/shared/theme";

const transferSchema = z.object({
  fromAccountId: z.string().min(1, "Select a source account"),
  toAccountId: z.string().min(1, "Select a destination account"),
  categoryId: z.string().nullable().optional(),
  title: z.string().min(1, "Title is required").max(120),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  notes: z.string().max(1000).nullable().optional(),
  transactionDate: z.string().min(1, "Date is required"),
});

export type TransferFormValues = z.output<typeof transferSchema>;

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };

type Props = {
  loading?: boolean;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onSubmit: (data: TransferFormValues) => void | Promise<void>;
};

export function TransferForm({ loading, accounts, categories, onSubmit }: Props) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const useDesktopRow = width >= 960;

  const fieldGroupStyle = { gap: spacing.sm, flex: 1 } as const;
  const labelStyle = { fontWeight: "700" as const };
  const inputStyle = {
    borderWidth: 3,
    borderColor: colors.text,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
    color: colors.text,
  } as const;

  const { control, handleSubmit, formState: { errors } } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema) as any,
    defaultValues: {
      fromAccountId: accounts[0]?.id ?? "",
      toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? "",
      categoryId: null,
      title: "Account transfer",
      amount: 0,
      notes: null,
      transactionDate: new Date().toISOString().slice(0, 10),
    },
  });

  return (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
      <View style={{ flexDirection: useDesktopRow ? "row" : "column", gap: spacing.lg }}>
        <Controller
          control={control}
          name="fromAccountId"
          render={({ field: { onChange, value } }) => (
            <Select
              label={t("transfers.fromAccount")}
              options={accounts.map((a) => ({ id: a.id, label: a.name }))}
              selected={value}
              onSelect={onChange}
              error={errors.fromAccountId?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="toAccountId"
          render={({ field: { onChange, value } }) => (
            <Select
              label={t("transfers.toAccount")}
              options={accounts.map((a) => ({ id: a.id, label: a.name }))}
              selected={value}
              onSelect={onChange}
              error={errors.toAccountId?.message}
            />
          )}
        />
      </View>

      <Controller
        control={control}
        name="categoryId"
        render={({ field: { onChange, value } }) => (
          <Select
            label={t("transfers.formCategory")}
            nullable
            nullLabel={t("transfers.formCategoryNone")}
            options={categories.map((category) => ({ id: category.id, label: category.name }))}
            selected={value ?? ""}
            onSelect={(nextValue) => onChange(nextValue === "" ? null : nextValue)}
            error={errors.categoryId?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={fieldGroupStyle}>
            <Text style={labelStyle}>{t("transfers.formTitle")}</Text>
            <NativeTextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Transfer title"
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
              <Text style={labelStyle}>{t("transfers.formAmount")}</Text>
              <NativeTextInput
                value={String(value ?? "")}
                onChangeText={(text) => onChange(text === "" ? 0 : Number(text))}
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
          name="transactionDate"
          render={({ field: { onChange, value } }) => (
            <DateField label={t("transfers.formDate")} value={value} onChange={onChange} error={errors.transactionDate?.message} />
          )}
        />
      </View>

      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={fieldGroupStyle}>
            <Text style={labelStyle}>{t("transfers.formNotes")}</Text>
            <NativeTextInput
              value={value ?? ""}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Optional notes"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ ...inputStyle, minHeight: 120, paddingTop: spacing.md }}
            />
            {errors.notes && <Text style={{ color: colors.danger, fontSize: 12 }}>{errors.notes.message}</Text>}
          </View>
        )}
      />

      <Button mode="contained" onPress={handleSubmit(onSubmit)} disabled={loading} loading={loading} style={{ marginTop: spacing.lg }}>
        {loading ? t("transfers.formCreating") : t("transfers.formCreate")}
      </Button>
    </View>
  );
}