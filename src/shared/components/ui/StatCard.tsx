
import { Text, View } from "react-native";
import { Card } from "react-native-paper";
import { typography, colors, spacing } from "@/shared/theme";

type Props = {
  title: string;
  value: string;
};

export default function StatCard({
  title,
  value,
}: Props) {
  return (
    <Card style={{ flex: 1, minWidth: 170 }}>
      <Card.Content style={{ justifyContent: "center", paddingVertical: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.textMuted, textTransform: "uppercase", marginBottom: spacing.sm }]}>
          {title}
        </Text>
        <Text style={[typography.h1, { color: colors.text }]}>
          {value}
        </Text>
      </Card.Content>
    </Card>
  );
}