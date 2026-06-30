// features/transactions/components/transaction-form.tsx
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  transactionSchema,
  TransactionFormInput,
  TransactionFormValues,
} from "../transaction.schema";

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
    <View style={styles.container}>
      {/* Type */}
      <Text style={styles.label}>Type</Text>
      <Controller
        control={control}
        name="type"
        render={({ field: { onChange, value } }) => (
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={value} onValueChange={onChange}>
              {TRANSACTION_TYPES.map((t) => (
                <Picker.Item key={t.value} label={t.label} value={t.value} />
              ))}
            </Picker>
          </View>
        )}
      />
      {errors.type && <Text style={styles.error}>{errors.type.message}</Text>}

      {/* Account */}
      <Text style={styles.label}>Account</Text>
      <Controller
        control={control}
        name="account_id"
        render={({ field: { onChange, value } }) => (
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={value} onValueChange={onChange}>
              {accounts.map((a) => (
                <Picker.Item key={a.id} label={a.name} value={a.id} />
              ))}
            </Picker>
          </View>
        )}
      />
      {errors.account_id && (
        <Text style={styles.error}>{errors.account_id.message}</Text>
      )}

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <Controller
        control={control}
        name="category_id"
        render={({ field: { onChange, value } }) => (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={value ?? ""}
              onValueChange={(v) => onChange(v === "" ? null : v)}
            >
              <Picker.Item label="Uncategorized" value="" />
              {categories.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
            </Picker>
          </View>
        )}
      />
      {errors.category_id && (
        <Text style={styles.error}>{errors.category_id.message}</Text>
      )}

      {/* Title */}
      <Text style={styles.label}>Title</Text>
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="e.g. Groceries"
          />
        )}
      />
      {errors.title && <Text style={styles.error}>{errors.title.message}</Text>}

      {/* Amount */}
      <Text style={styles.label}>Amount</Text>
      <Controller
        control={control}
        name="amount"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={String(value ?? "")}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="numeric"
            placeholder="0.00"
          />
        )}
      />
      {errors.amount && <Text style={styles.error}>{errors.amount.message}</Text>}

      {/* Date */}
      <Text style={styles.label}>Date</Text>
      <Controller
        control={control}
        name="date"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="YYYY-MM-DD"
          />
        )}
      />
      {errors.date && <Text style={styles.error}>{errors.date.message}</Text>}

      {/* Notes */}
      <Text style={styles.label}>Notes</Text>
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, styles.multiline]}
            value={value ?? ""}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Optional"
            multiline
          />
        )}
      />
      {errors.notes && <Text style={styles.error}>{errors.notes.message}</Text>}

      {/* Submit */}
      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? "Saving..." : "Save"}</Text>
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
  multiline: { minHeight: 80, textAlignVertical: "top" },
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