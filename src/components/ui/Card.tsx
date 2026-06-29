
import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import {
  border,
  colors,
  radius,
  shadows,
  spacing,
} from "@/theme";

type Props = {
  children: ReactNode;
};

export default function Card({ children }: Props) {
  return (
    <View style={styles.card}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,

    padding: spacing.xl,
    marginBottom: spacing.lg,

    borderRadius: radius.md,

    borderWidth: border.thick,
    borderColor: colors.border,

    ...shadows.lg,
  },
});