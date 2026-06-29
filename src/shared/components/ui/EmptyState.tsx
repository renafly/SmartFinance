import { StyleSheet, Text, View } from "react-native";
import {
  typography,
  colors,
  spacing,
} from "@/shared/theme";

type Props = {
  message: string;
};

export default function EmptyState({
  message,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },

  text: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
});