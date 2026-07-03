import { colors, spacing } from "@/shared/theme";
import { ReactNode } from "react";
import { ScrollView } from "react-native";

type Props = {
  children: ReactNode;
};

export default function Screen({ children }: Props) {
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
        gap: spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}