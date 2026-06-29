
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  typography,
  colors,
  spacing,
} from "@/theme";

type Props = {
  title: string;
  children: ReactNode;
};

export default function Section({
  title,
  children,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title}
      </Text>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },

  title: {
    ...typography.h2,
    color: colors.text,
  },
});