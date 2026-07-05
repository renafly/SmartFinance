// features/accounts/components/account-form.tsx
import { TextInput as NativeTextInput, useWindowDimensions, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Text } from "react-native-paper";

import {
  accountSchema,
  AccountFormInput,
  AccountFormValues,
} from "../account.schema";
import { Select } from "@/shared/components/ui/Select";
import { colors, spacing } from "@/shared/theme";

const ACCOUNT_TYPES: { label: string; value: AccountFormInput["type"] }[] = [
  { label: "Bank", value: "bank" },
  { label: "Cash", value: "cash" },
  { label: "Investment", value: "investment" },
  { label: "Savings", value: "savings" },
];

type AccountFormProps = {
  loading?: boolean;
  onSubmit: (data: AccountFormValues) => void | Promise<void>;
  defaultValues?: Partial<AccountFormInput>;
  ownerOptions?: { id: string; label: string }[];
};

export function AccountForm({ loading, onSubmit, defaultValues, ownerOptions = [] }: AccountFormProps) {
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
    borderWidth: 1,
    borderColor: colors.border,
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
  } = useForm<AccountFormInput, any, AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "bank",
      currency: "EUR",
      initial_balance: 0,
      owner_profile_id: null,
      ...defaultValues,
    },
  });

  return (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={fieldGroupStyle}>
            <Text style={labelStyle}>Name</Text>
            <NativeTextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. Main Checking"
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
            />
            {errors.name && <Text style={{ color: colors.danger, fontSize: 12 }}>{errors.name.message}</Text>}
          </View>
        )}
      />

      <View style={{ flexDirection: useDesktopRow ? "row" : "column", gap: spacing.lg }}>
        <Controller
          control={control}
          name="owner_profile_id"
          render={({ field: { onChange, value } }) => (
            <Select
              label="Owner"
              nullable
              nullLabel="Shared household account"
              options={ownerOptions}
              selected={value ?? null}
              onSelect={(v) => onChange(v === "" ? null : v)}
              error={errors.owner_profile_id?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="type"
          render={({ field: { onChange, value } }) => (
            <Select
              label="Type"
              options={ACCOUNT_TYPES.map((t) => ({ id: t.value, label: t.label }))}
              selected={value}
              onSelect={(v) => onChange(v as AccountFormInput["type"])}
              error={errors.type?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="currency"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={fieldGroupStyle}>
              <Text style={labelStyle}>Currency</Text>
              <NativeTextInput
                value={value}
                onChangeText={(v) => onChange(v.toUpperCase())}
                onBlur={onBlur}
                placeholder="EUR"
                placeholderTextColor={colors.textMuted}
                maxLength={3}
                autoCapitalize="characters"
                style={inputStyle}
              />
              {errors.currency && <Text style={{ color: colors.danger, fontSize: 12 }}>{errors.currency.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="initial_balance"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={fieldGroupStyle}>
              <Text style={labelStyle}>Initial Balance</Text>
              <NativeTextInput
                value={String(value ?? "")}
                onChangeText={(v) => onChange(v === "" ? 0 : Number(v))}
                onBlur={onBlur}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={inputStyle}
              />
              {errors.initial_balance && (
                <Text style={{ color: colors.danger, fontSize: 12 }}>{errors.initial_balance.message}</Text>
              )}
            </View>
          )}
        />
      </View>

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