import { View } from "react-native";
import { Text } from "react-native-paper";
import { spacing } from "@/shared/theme";

type Props = {
  title: string;
  subtitle?: string;
};

export default function PageHeader({
  title,
  subtitle,
}: Props) {
  return (
    <View style={{ marginBottom: spacing.xxl }}>
      <Text variant="displaySmall" style={{ fontWeight: "900", marginBottom: subtitle ? spacing.sm : 0 }}>
        {title}
      </Text>

      {subtitle && (
        <Text variant="bodyMedium">
          {subtitle}
        </Text>
      )}
    </View>
  );
}