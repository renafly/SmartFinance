import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import {
  useAcceptHouseholdInvitation,
  useCreateHouseholdInvitation,
  useHouseholdInvitations,
  useMyHouseholdInvitations,
  useDeclineHouseholdInvitation,
  useRevokeHouseholdInvitation,
  useLeaveHousehold,
} from "@/features/households/hooks";
import {
  useMyHouseholds,
  useSetDefaultHousehold,
} from "@/features/households/hooks/useDefaultHousehold";
import { useHouseholdMemberDetails } from "@/features/households/hooks/useHouseholdMemberDetails";
import Button from "@/shared/components/ui/Button";
import { useSession } from "@/shared/session";
import type { Database } from "@/shared/types/database.types";
import { border, colors, radius, spacing, typography } from "@/shared/theme";

type HouseholdRole = Database["public"]["Enums"]["household_role"];

const ROLE_OPTIONS: HouseholdRole[] = ["member", "admin"];

function formatDate(value: string | null): string {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SettingsScreen() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  const { data: invitations = [], isPending: invitationsLoading } =
    useHouseholdInvitations();
  const { data: myInvitations = [], isPending: myInvitationsLoading } =
    useMyHouseholdInvitations();
  const { data: myHouseholds = [], isPending: householdsLoading } =
    useMyHouseholds();
  const { data: members = [], isPending: membersLoading } =
    useHouseholdMemberDetails();

  const setDefaultHousehold = useSetDefaultHousehold();
  const acceptInvitation = useAcceptHouseholdInvitation();
  const createInvitation = useCreateHouseholdInvitation();
  const declineInvitation = useDeclineHouseholdInvitation();
  const revokeInvitation = useRevokeHouseholdInvitation();
  const leaveHouseholdMutation = useLeaveHousehold();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<HouseholdRole>("member");
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [emailQueued, setEmailQueued] = useState<boolean | null>(null);

  const householdId = session?.household.id;
  const householdName = session?.household.name ?? "Household";
  const defaultHouseholdId =
    session?.profile.default_household_id ?? session?.household.id;
  const currentUserRole = session?.membership?.role;

  const canManageInvites =
    currentUserRole === "owner" || currentUserRole === "admin";

  const formError = useMemo(() => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();

    if (!normalizedEmail) return null;
    if (!isValidEmail(normalizedEmail)) return "Enter a valid email address.";

    const alreadyInvited = invitations.some(
      (invitation) => invitation.email.toLowerCase() === normalizedEmail
    );

    if (alreadyInvited) return "This email already has a pending invitation.";

    return null;
  }, [inviteEmail, invitations]);

  const isSubmitting = createInvitation.isPending;
  const isInviteDisabled =
    !canManageInvites || !householdId || !inviteEmail.trim() || !!formError || isSubmitting;

  const onInvite = () => {
    if (!householdId || isInviteDisabled) return;

    createInvitation.mutate(
      {
        householdId,
        email: inviteEmail,
        role: inviteRole,
      },
      {
        onSuccess: (result) => {
          setInviteEmail("");
          setInviteRole("member");
          setLastInviteLink(result.inviteLink);
          setEmailQueued(result.emailQueued);
        },
      }
    );
  };

  const handleLeaveHousehold = () => {
    if (!householdId) return;

    Alert.alert(
      "Leave Household?",
      `Are you sure you want to leave ${householdName}? You'll lose access to all household data.`,
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Leave",
          onPress: () => {
            leaveHouseholdMutation.mutate(householdId, {
              onSuccess: () => {
                Alert.alert("Success", "You left the household.", [
                  {
                    text: "OK",
                    onPress: () => {
                      router.replace("/(app)");
                    },
                  },
                ]);
              },
              onError: (error) => {
                Alert.alert("Error", error.message);
              },
            });
          },
          style: "destructive",
        },
      ]
    );
  };

  if (sessionLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Household Settings</Text>
      <Text style={styles.subtitle}>{householdName}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default Household</Text>

        {householdsLoading ? (
          <ActivityIndicator />
        ) : myHouseholds.length === 0 ? (
          <Text style={styles.emptyText}>No available households.</Text>
        ) : (
          myHouseholds.map((household) => {
            const isDefault = household.id === defaultHouseholdId;
            const isCurrent = household.id === householdId;

            return (
              <View key={household.id} style={styles.listCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{household.name}</Text>
                  <View style={styles.badgeRow}>
                    {isCurrent ? (
                      <Text style={styles.cardMeta}>active</Text>
                    ) : null}
                    {isDefault ? (
                      <Text style={styles.cardMeta}>default</Text>
                    ) : null}
                  </View>
                </View>

                {!isDefault ? (
                  <Button
                    title="Set As Default"
                    variant="secondary"
                    onPress={() => setDefaultHousehold.mutate(household.id)}
                    loading={setDefaultHousehold.isPending}
                    disabled={setDefaultHousehold.isPending}
                  />
                ) : null}
              </View>
            );
          })
        )}

        {setDefaultHousehold.error ? (
          <Text style={styles.errorText}>{String(setDefaultHousehold.error.message)}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invite Member</Text>

        {!canManageInvites ? (
          <Text style={styles.infoText}>
            Only owners and admins can send invitations.
          </Text>
        ) : null}

        <TextInput
          value={inviteEmail}
          onChangeText={setInviteEmail}
          placeholder="member@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <View style={styles.roleRow}>
          {ROLE_OPTIONS.map((role) => {
            const selected = inviteRole === role;
            return (
              <Pressable
                key={role}
                onPress={() => setInviteRole(role)}
                style={[styles.roleChip, selected && styles.roleChipSelected]}
              >
                <Text style={[styles.roleChipText, selected && styles.roleChipTextSelected]}>
                  {role}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        {createInvitation.error ? (
          <Text style={styles.errorText}>{String(createInvitation.error.message)}</Text>
        ) : null}

        {lastInviteLink ? (
          <View style={styles.linkBox}>
            <Text style={styles.linkLabel}>
              Invite link
            </Text>
            <Text style={styles.linkValue}>{lastInviteLink}</Text>
            <Text style={styles.infoText}>
              {emailQueued
                ? "Email dispatch requested successfully."
                : "Email function is not available yet. Share this link manually for now."}
            </Text>
          </View>
        ) : null}

        <Button title="Send Invitation" onPress={onInvite} disabled={isInviteDisabled} loading={isSubmitting} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Invitations</Text>

        {myInvitationsLoading ? (
          <ActivityIndicator />
        ) : myInvitations.length === 0 ? (
          <Text style={styles.emptyText}>No invitations pending for your account.</Text>
        ) : (
          myInvitations.map((invitation) => (
            <View key={invitation.id} style={styles.listCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{invitation.household_name}</Text>
                <Text style={styles.cardMeta}>{invitation.role}</Text>
              </View>

              <Text style={styles.cardMeta}>Invited as: {invitation.email}</Text>
              <Text style={styles.cardMeta}>Expires: {formatDate(invitation.expires_at)}</Text>

              <View style={styles.inlineActions}>
                <Button
                  title="Accept"
                  onPress={() => acceptInvitation.mutate(invitation.token)}
                  loading={acceptInvitation.isPending}
                  disabled={acceptInvitation.isPending || declineInvitation.isPending}
                />
                <Button
                  title="Decline"
                  variant="secondary"
                  onPress={() => declineInvitation.mutate(invitation.token)}
                  loading={declineInvitation.isPending}
                  disabled={acceptInvitation.isPending || declineInvitation.isPending}
                />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Invitations</Text>

        {invitationsLoading ? (
          <ActivityIndicator />
        ) : invitations.length === 0 ? (
          <Text style={styles.emptyText}>No pending invitations.</Text>
        ) : (
          invitations.map((invitation) => (
            <View key={invitation.id} style={styles.listCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{invitation.email}</Text>
                <Text style={styles.cardMeta}>{invitation.role}</Text>
              </View>

              <Text style={styles.cardMeta}>Expires: {formatDate(invitation.expires_at)}</Text>

              {canManageInvites ? (
                <View style={styles.cardActionRow}>
                  <Button
                    title="Revoke"
                    variant="secondary"
                    onPress={() => revokeInvitation.mutate(invitation.id)}
                    loading={revokeInvitation.isPending}
                    disabled={revokeInvitation.isPending}
                  />
                </View>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members</Text>

        {membersLoading ? (
          <ActivityIndicator />
        ) : members.length === 0 ? (
          <Text style={styles.emptyText}>No household members found.</Text>
        ) : (
          members.map((member) => (
            <View key={member.userId} style={styles.listCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{member.fullName ?? member.email ?? member.userId}</Text>
                <Text style={styles.cardMeta}>{member.role}</Text>
              </View>

              <Text style={styles.cardMeta}>{member.email ?? "No email"}</Text>
              <Text style={styles.cardMeta}>Status: {member.status}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <Button
          title="Leave Household"
          onPress={handleLeaveHousehold}
          loading={leaveHouseholdMutation.isPending}
          disabled={leaveHouseholdMutation.isPending}
        />
        {leaveHouseholdMutation.error && (
          <Text style={styles.errorText}>
            {String(leaveHouseholdMutation.error.message)}
          </Text>
        )}
      </View>
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

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    ...typography.h2,
    color: colors.text,
  },

  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },

  section: {
    backgroundColor: colors.surface,
    borderWidth: border.thick,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },

  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },

  input: {
    borderWidth: border.thick,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
  },

  roleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  roleChip: {
    borderWidth: border.thick,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },

  roleChipSelected: {
    backgroundColor: colors.primary,
  },

  roleChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },

  roleChipTextSelected: {
    color: colors.text,
  },

  listCard: {
    borderWidth: border.thin,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.xs,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },

  cardTitle: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },

  cardMeta: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "capitalize",
  },

  cardActionRow: {
    marginTop: spacing.sm,
  },

  badgeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
  },

  inlineActions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },

  linkBox: {
    borderWidth: border.thin,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.sm,
    gap: spacing.xs,
  },

  linkLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  linkValue: {
    ...typography.caption,
    color: colors.text,
  },

  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
});