import { View, Text } from "react-native";
import { Avatar, Card } from "react-native-paper";
import { useAuthContext } from "@/shared/hooks/use-auth-context";
import { spacing, colors } from "@/shared/theme";

export default function UserCard() {
  const { claims } = useAuthContext();

  const email = claims?.email ?? "";

  return (
    <Card
      style={{
        marginTop: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Card.Content style={{ alignItems: "center", paddingVertical: spacing.lg }}>
        <Avatar.Text label={email.charAt(0).toUpperCase()} size={48} />
        <Text style={{ marginTop: spacing.md, fontWeight: "700", textAlign: "center" }}>
          {email}
        </Text>
      </Card.Content>
    </Card>
  );
}