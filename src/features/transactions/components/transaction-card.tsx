import { List } from "react-native-paper";
import { Text } from "react-native";

import { useFormatters } from "@/shared/i18n";
import type { Transaction } from "../types/types";
import { colors } from "@/shared/theme";

type Props = {
  transaction: Transaction;
  onPress: () => void;
};

export function TransactionCard({ transaction, onPress }: Props) {
  const { formatDate } = useFormatters();
  const isExpense = transaction.type === "expense";
  const sign = isExpense ? "-" : "+";

  const formattedDate = formatDate(transaction.transaction_date, {
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
    <List.Item
      title={transaction.title}
      description={metaParts.join(" · ")}
      right={() => (
        <Text style={{
          fontWeight: "700",
          fontSize: 16,
          color: isExpense ? colors.danger : colors.success,
        }}>
          {sign}{formattedAmount}
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