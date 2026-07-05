import { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { spacing } from "@/shared/theme";

type Props = {
  title: string;
  children: ReactNode;
};

export default function Section({
  title,
  children,
}: Props) {
  return (
    <View style={{ marginBottom: spacing.xxl, gap: spacing.md }}>
      <Text variant="headlineSmall" style={{ fontWeight: "700" }}>
        {title}
      </Text>
      {children}
    </View>
  );
}