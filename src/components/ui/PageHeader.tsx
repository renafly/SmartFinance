import { StyleSheet, Text, View } from "react-native";
import {
  typography,
  colors,
  spacing,
} from "@/theme";

type Props = {
  title: string;
  subtitle?: string;
};

export default function PageHeader({
  title,
  subtitle,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {subtitle && (
        <Text style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },

  title: {
    ...typography.display,
    color: colors.text,
  },

  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});