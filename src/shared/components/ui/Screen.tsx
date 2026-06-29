import { colors, spacing } from "@/shared/theme";
import { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";

type Props = {
  children: ReactNode;
};

export default function Screen({ children }: Props) {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,

    backgroundColor: colors.background,

    padding: spacing.lg,

    gap: spacing.lg,
  },
});