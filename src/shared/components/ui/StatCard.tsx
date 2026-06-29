
import { StyleSheet, Text, View } from "react-native";
import {
  typography,
  colors,
  spacing,
  radius,
  border,
  shadows,
} from "@/shared/theme";

type Props = {
  title: string;
  value: string;
};

export default function StatCard({
  title,
  value,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 170,

    backgroundColor: colors.primary,

    padding: spacing.lg,

    borderRadius: radius.md,

    borderWidth: border.thick,
    borderColor: colors.border,

    ...shadows.md,
  },

  title: {
    ...typography.caption,
    color: colors.text,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },

  value: {
    ...typography.h1,
    color: colors.text,
  },
});