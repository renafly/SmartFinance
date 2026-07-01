import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography, radius } from "@/shared/theme";

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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {fullName || "Unknown"}
          {isCurrentUser && " (You)"}
        </Text>
        {email && (
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
        )}
      </View>

      <View style={[styles.roleBadge, { backgroundColor: roleColors[role] }]}>
        <Text style={styles.roleText}>{roleLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  pressed: {
    opacity: 0.7,
  },

  details: {
    flex: 1,
    marginRight: spacing.md,
    gap: 4,
  },

  title: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },

  email: {
    ...typography.caption,
    color: colors.textMuted,
  },

  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },

  roleText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: "600",
  },
});
