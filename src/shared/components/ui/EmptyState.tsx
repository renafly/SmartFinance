import { View } from "react-native";
import { Text } from "react-native-paper";
import { spacing, colors } from "@/shared/theme";

type Props = {
  message: string;
};

export default function EmptyState({
  message,
}: Props) {
  return (
    <View style={{
      paddingVertical: spacing.xxl,
      alignItems: "center",
    }}>
      <Text style={{
        color: colors.textSecondary,
        textAlign: "center",
      }}>
        {message}
      </Text>
    </View>
  );
}