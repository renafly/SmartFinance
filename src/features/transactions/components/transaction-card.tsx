import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Transaction } from "../types/types";
import { colors, spacing, typography, radius } from "@/shared/theme";

type Props = {
  transaction: Transaction;
  onPress: () => void;
};

export function TransactionCard({ transaction, onPress }: Props) {
  const isExpense = transaction.type === "expense";
  const sign = isExpense ? "-" : "+";

  const formattedDate = new Date(
    transaction.transaction_date
  ).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const formattedAmount = Math.abs(transaction.amount).toFixed(2);

  const metaParts = [
    formattedDate,
    transaction.account?.name,
    transaction.category?.name,
    transaction.created_by_profile?.full_name,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {transaction.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {metaParts.join(" · ")}
        </Text>
      </View>

      <Text style={isExpense ? styles.expense : styles.income}>
        {sign}
        {formattedAmount}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.text,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  pressed: {
    opacity: 0.7,
  },

  details: {
    flex: 1,
    marginRight: spacing.md,
    gap: 2,
  },

  title: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },

  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },

  expense: {
    ...typography.body,
    fontWeight: "600",
    color: colors.danger,
  },

  income: {
    ...typography.body,
    fontWeight: "600",
    color: colors.success,
  },
});