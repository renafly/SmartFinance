import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Account } from "../types";
import { colors, spacing, typography, radius } from "@/shared/theme";

type Props = {
  account: Account;
  onPress: () => void;
};

export function AccountCard({ account, onPress }: Props) {
  const formattedBalance = Math.abs(account.initial_balance).toFixed(2);
  const isNegative = account.initial_balance < 0;
  const sign = isNegative ? "-" : "";

  const formattedType = account.type
    ? account.type.charAt(0).toUpperCase() + account.type.slice(1)
    : undefined;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {account.name}
        </Text>
        {formattedType && (
          <Text style={styles.meta} numberOfLines={1}>
            {formattedType}
          </Text>
        )}
      </View>

      <Text style={isNegative ? styles.negative : styles.balance}>
        {sign}
        {formattedBalance}
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

  balance: {
    ...typography.body,
    fontWeight: "600",
    color: colors.text,
  },

  negative: {
    ...typography.body,
    fontWeight: "600",
    color: colors.danger,
  },
});