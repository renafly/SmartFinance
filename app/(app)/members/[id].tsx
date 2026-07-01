import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useHouseholdMemberDetails } from "@/features/households/hooks";
import { MemberActionButtons } from "@/features/households/components/member-action-buttons";
import { useI18n } from "@/shared/i18n";
import { useSession } from "@/shared/session";
import { colors, spacing, typography, radius } from "@/shared/theme";

export default function MemberDetailScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: memberId } = useLocalSearchParams<{ id: string }>();
  const { data: session } = useSession();
  const { data: members, isLoading } = useHouseholdMemberDetails();

  const householdId = session?.household.id;
  const currentUserId = session?.profile.id;
  const isOwner = session?.membership?.role === "owner";

  const member = members?.find((m) => m.userId === memberId);

  if (isLoading) {
    return (
      <View style={[styles.container, { marginTop: insets.top + spacing.md }]}>
        <Text style={styles.loadingText}>{t("members.loading")}</Text>
      </View>
    );
  }

  if (!member) {
    return (
      <View style={[styles.container, { marginTop: insets.top + spacing.md }]}>
        <Text style={styles.errorText}>{t("members.notFound")}</Text>
      </View>
    );
  }

  const isCurrentUser = member.userId === currentUserId;

  return (
    <ScrollView
      style={[styles.container, { marginTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.card}>
        <Text style={styles.name}>{member.fullName || t("members.unknown")}</Text>
        {member.email && (
          <Text style={styles.email}>{member.email}</Text>
        )}

        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>{t("members.role")}</Text>
          <Text style={styles.roleValue}>
            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>{t("members.status")}</Text>
          <Text style={styles.statusValue}>
            {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
          </Text>
        </View>

        {isCurrentUser && (
          <View style={styles.yourBadge}>
            <Text style={styles.yourBadgeText}>{t("members.thisIsYou")}</Text>
          </View>
        )}
      </View>

      {householdId && !isCurrentUser && (
        <View style={styles.actionsContainer}>
          <MemberActionButtons
            memberId={memberId!}
            memberName={member.fullName}
            memberRole={member.role}
            householdId={householdId}
            currentUserIsOwner={isOwner}
            currentUserId={currentUserId!}
            isCurrentUser={isCurrentUser}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },

  name: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  email: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },

  roleContainer: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  roleLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },

  roleValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },

  statusContainer: {
    marginBottom: spacing.md,
  },

  statusLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },

  statusValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },

  yourBadge: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.info,
    borderRadius: radius.sm,
    alignItems: "center",
  },

  yourBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: "600",
  },

  actionsContainer: {
    paddingHorizontal: spacing.md,
  },

  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },

  errorText: {
    ...typography.body,
    color: colors.warning,
    textAlign: "center",
  },
});
