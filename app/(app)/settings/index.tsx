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
import HouseholdCreateCard from "@/features/households/components/household-create-card";
import { useSession } from "@/shared/session";
import type { Database } from "@/shared/types/database.types";
import { border, colors, radius, spacing, typography } from "@/shared/theme";
import { AppLanguage, TranslationKey, useI18n } from "@/shared/i18n";

type HouseholdRole = Database["public"]["Enums"]["household_role"];

const ROLE_OPTIONS: HouseholdRole[] = ["member", "admin"];

function roleLabel(role: HouseholdRole, t: (key: TranslationKey, params?: Record<string, string>) => string): string {
  if (role === "owner") return t("settings.role.owner");
  if (role === "admin") return t("settings.role.admin");
  return t("settings.role.member");
}

function formatDate(
  value: string | null,
  locale: string,
  noDateLabel: string,
  invalidDateLabel: string
): string {
  if (!value) return noDateLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return invalidDateLabel;

  return date.toLocaleDateString(locale);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SettingsScreen() {
  const { t, language, setLanguage } = useI18n();
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
  const householdName = session?.household.name ?? t("settings.title");
  const defaultHouseholdId =
    session?.profile.default_household_id ?? session?.household.id;
  const currentUserRole = session?.membership?.role;

  const canManageInvites =
    currentUserRole === "owner" || currentUserRole === "admin";

  const formError = useMemo(() => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();

    if (!normalizedEmail) return null;
    if (!isValidEmail(normalizedEmail)) return t("settings.invalidEmail");

    const alreadyInvited = invitations.some(
      (invitation) => invitation.email.toLowerCase() === normalizedEmail
    );

    if (alreadyInvited) return t("settings.alreadyInvited");

    return null;
  }, [inviteEmail, invitations, t]);

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
      t("settings.leaveTitle"),
      t("settings.leaveMessage", { householdName }),
      [
        { text: t("settings.cancel"), onPress: () => {} },
        {
          text: t("settings.leave"),
          onPress: () => {
            leaveHouseholdMutation.mutate(householdId, {
              onSuccess: () => {
                Alert.alert(t("settings.success"), t("settings.leftHousehold"), [
                  {
                    text: "OK",
                    onPress: () => {
                      router.replace("/(app)");
                    },
                  },
                ]);
              },
              onError: (error) => {
                Alert.alert(t("settings.error"), error.message);
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
      <Text style={styles.title}>{t("settings.title")}</Text>
      <Text style={styles.subtitle}>{householdName}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
        <Text style={styles.infoText}>{t("settings.languageSubtitle")}</Text>
        <View style={styles.roleRow}>
          {([
            { value: "pt-PT", label: t("settings.languagePortuguese") },
            { value: "en", label: t("settings.languageEnglish") },
          ] as const).map((option) => {
            const selected = language === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => void setLanguage(option.value as AppLanguage)}
                style={[styles.roleChip, selected && styles.roleChipSelected]}
              >
                <Text style={[styles.roleChipText, selected && styles.roleChipTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.householdManagement")}</Text>
        <HouseholdCreateCard
          title={t("settings.createHousehold")}
          subtitle={t("settings.createHouseholdSubtitle")}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.defaultHousehold")}</Text>

        {householdsLoading ? (
          <ActivityIndicator />
        ) : myHouseholds.length === 0 ? (
          <Text style={styles.emptyText}>{t("settings.noHouseholds")}</Text>
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
                      <Text style={styles.cardMeta}>{t("settings.active")}</Text>
                    ) : null}
                    {isDefault ? (
                      <Text style={styles.cardMeta}>{t("settings.default")}</Text>
                    ) : null}
                  </View>
                </View>

                {!isDefault ? (
                  <Button
                    title={t("settings.setAsDefault")}
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
        <Text style={styles.sectionTitle}>{t("settings.inviteMember")}</Text>

        {!canManageInvites ? (
          <Text style={styles.infoText}>
            {t("settings.onlyAdminsInvite")}
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
                  {roleLabel(role, t)}
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
              {t("settings.inviteLink")}
            </Text>
            <Text style={styles.linkValue}>{lastInviteLink}</Text>
            <Text style={styles.infoText}>
              {emailQueued
                ? t("settings.emailQueued")
                : t("settings.emailNotAvailable")}
            </Text>
          </View>
        ) : null}

        <Button title={t("settings.sendInvitation")} onPress={onInvite} disabled={isInviteDisabled} loading={isSubmitting} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.myInvitations")}</Text>

        {myInvitationsLoading ? (
          <ActivityIndicator />
        ) : myInvitations.length === 0 ? (
          <Text style={styles.emptyText}>{t("settings.noMyInvitations")}</Text>
        ) : (
          myInvitations.map((invitation) => (
            <View key={invitation.id} style={styles.listCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{invitation.household_name}</Text>
                <Text style={styles.cardMeta}>{roleLabel(invitation.role, t)}</Text>
              </View>

              <Text style={styles.cardMeta}>{t("settings.invitedAs", { email: invitation.email })}</Text>
              <Text style={styles.cardMeta}>
                {t("settings.expires", {
                  date: formatDate(
                    invitation.expires_at,
                    language,
                    t("settings.noDate"),
                    t("settings.invalidDate")
                  ),
                })}
              </Text>

              <View style={styles.inlineActions}>
                <Button
                  title={t("settings.accept")}
                  onPress={() => acceptInvitation.mutate(invitation.token)}
                  loading={acceptInvitation.isPending}
                  disabled={acceptInvitation.isPending || declineInvitation.isPending}
                />
                <Button
                  title={t("settings.decline")}
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
        <Text style={styles.sectionTitle}>{t("settings.pendingInvitations")}</Text>

        {invitationsLoading ? (
          <ActivityIndicator />
        ) : invitations.length === 0 ? (
          <Text style={styles.emptyText}>{t("settings.noPendingInvitations")}</Text>
        ) : (
          invitations.map((invitation) => (
            <View key={invitation.id} style={styles.listCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{invitation.email}</Text>
                <Text style={styles.cardMeta}>{roleLabel(invitation.role, t)}</Text>
              </View>

              <Text style={styles.cardMeta}>
                {t("settings.expires", {
                  date: formatDate(
                    invitation.expires_at,
                    language,
                    t("settings.noDate"),
                    t("settings.invalidDate")
                  ),
                })}
              </Text>

              {canManageInvites ? (
                <View style={styles.cardActionRow}>
                  <Button
                    title={t("settings.revoke")}
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
        <Text style={styles.sectionTitle}>{t("settings.members")}</Text>

        {membersLoading ? (
          <ActivityIndicator />
        ) : members.length === 0 ? (
          <Text style={styles.emptyText}>{t("settings.noMembers")}</Text>
        ) : (
          members.map((member) => (
            <View key={member.userId} style={styles.listCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{member.fullName ?? member.email ?? member.userId}</Text>
                <Text style={styles.cardMeta}>{t(`settings.role.${member.role}` as const)}</Text>
              </View>

              <Text style={styles.cardMeta}>{member.email ?? t("settings.noEmail")}</Text>
              <Text style={styles.cardMeta}>{t("settings.status", { status: member.status })}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.dangerZone")}</Text>
        <Button
          title={t("settings.leaveHousehold")}
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