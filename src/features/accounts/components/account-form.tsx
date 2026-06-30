// features/accounts/components/account-form.tsx
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  accountSchema,
  AccountFormInput,
  AccountFormValues,
} from "../account.schema";

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
};

export function AccountForm({ loading, onSubmit, defaultValues }: AccountFormProps) {
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
      ...defaultValues,
    },
  });

  return (
    <View style={styles.container}>
      {/* Name */}
      <Text style={styles.label}>Name</Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="e.g. Main Checking"
          />
        )}
      />
      {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

      {/* Type */}
      <Text style={styles.label}>Type</Text>
      <Controller
        control={control}
        name="type"
        render={({ field: { onChange, value } }) => (
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={value} onValueChange={onChange}>
              {ACCOUNT_TYPES.map((t) => (
                <Picker.Item key={t.value} label={t.label} value={t.value} />
              ))}
            </Picker>
          </View>
        )}
      />
      {errors.type && <Text style={styles.error}>{errors.type.message}</Text>}

      {/* Currency */}
      <Text style={styles.label}>Currency</Text>
      <Controller
        control={control}
        name="currency"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(v) => onChange(v.toUpperCase())}
            onBlur={onBlur}
            placeholder="EUR"
            maxLength={3}
            autoCapitalize="characters"
          />
        )}
      />
      {errors.currency && <Text style={styles.error}>{errors.currency.message}</Text>}

      {/* Initial Balance */}
      <Text style={styles.label}>Initial Balance</Text>
      <Controller
        control={control}
        name="initial_balance"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={String(value ?? "")}
            onChangeText={(v) => onChange(Number(v))}
            onBlur={onBlur}
            keyboardType="numeric"
            placeholder="0"
          />
        )}
      />
      {errors.initial_balance && (
        <Text style={styles.error}>{errors.initial_balance.message}</Text>
      )}

      {/* Submit */}
      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Saving..." : "Save"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  error: { color: "#d33", fontSize: 12, marginTop: 2 },
  button: {
    marginTop: 24,
    backgroundColor: "#222",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});