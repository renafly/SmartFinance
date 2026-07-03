import { List } from "react-native-paper";
import { Text } from "react-native";

import type { Account } from "../types";
import { colors } from "@/shared/theme";

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
    <List.Item
      title={account.name}
      description={formattedType}
      right={() => (
        <Text style={{
          fontWeight: "700",
          fontSize: 16,
          color: isNegative ? colors.danger : colors.text,
        }}>
          {sign}{formattedBalance}
        </Text>
      )}
      onPress={onPress}
      style={{
        backgroundColor: colors.surface,
        borderWidth: 3,
        borderColor: colors.text,
        marginBottom: 8,
      }}
    />
  );
}