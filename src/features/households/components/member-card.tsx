import { List, Chip } from "react-native-paper";

import { colors } from "@/shared/theme";

type Props = {
  fullName: string | null;
  email: string | null;
  role: "owner" | "admin" | "member";
  isCurrentUser: boolean;
  onPress: () => void;
};

const roleColors: Record<string, string> = {
  owner: colors.warning,
  admin: colors.accent,
  member: colors.info,
};

export function MemberCard({
  fullName,
  email,
  role,
  isCurrentUser,
  onPress,
}: Props) {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <List.Item
      title={`${fullName || "Unknown"}${isCurrentUser ? " (You)" : ""}`}
      description={email || ""}
      right={() => (
        <Chip
          label={roleLabel}
          style={{
            backgroundColor: roleColors[role],
            borderWidth: 2,
            borderColor: colors.text,
          }}
        />
      )}
      onPress={onPress}
      style={{
        backgroundColor: colors.surface,
        borderWidth: 3,
        borderColor: colors.text,
        marginBottom: 8,
      }}
    />
  );
}
