import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

import { Page, Card, Section, Field, Button, Pill } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import {
  useCreateHouseholdInvitation,
  useDeclineHouseholdInvitation,
  useHouseholdInvitations,
  useHouseholdMemberDetails,
  useHouseholdMembers,
  useLeaveHousehold,
  useMyHouseholdInvitations,
  useRemoveHouseholdMember,
  useRevokeHouseholdInvitation,
  useTransferHouseholdOwnership,
  useAcceptHouseholdInvitation,
} from '../../features/households/hooks';

const roles = ['owner', 'admin', 'member'] as const;

export default function MembersScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const { householdId, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof roles)[number]>('member');
  const membersQuery = useHouseholdMemberDetails();
  const compactMembersQuery = useHouseholdMembers();
  const invitationsQuery = useHouseholdInvitations();
  const myInvitationsQuery = useMyHouseholdInvitations();
  const createInvitation = useCreateHouseholdInvitation();
  const revokeInvitation = useRevokeHouseholdInvitation();
  const acceptInvitation = useAcceptHouseholdInvitation();
  const declineInvitation = useDeclineHouseholdInvitation();
  const transferOwnership = useTransferHouseholdOwnership();
  const removeMember = useRemoveHouseholdMember();
  const leaveHousehold = useLeaveHousehold();

  const firstOtherMember = useMemo(() => (membersQuery.data ?? []).find((member) => member.role !== 'owner'), [membersQuery.data]);
  const canInviteMember = !createInvitation.isPending && email.trim().length > 0;
  const currentUserId = profile?.id ?? null;

  async function handleCreateInvitation() {
    if (!householdId || !email.trim()) return;

    await createInvitation.mutateAsync({
      householdId,
      email: email.trim(),
      role,
    });

    setEmail('');
  }

  function handleRemoveMember(member: { userId: string; fullName: string | null; email: string | null; role: string }) {
    if (!householdId) return;

    const displayName = member.fullName ?? member.email ?? t('members.thisMember');

    Alert.alert(
      t('members.removeTitle'),
      t('members.removeMessage', { name: displayName }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: () =>
            void removeMember.mutateAsync({
              householdId,
              userIdToRemove: member.userId,
            }),
        },
      ],
    );
  }

  return (
    <Page title={t('members.title')} subtitle={t('members.subtitle')}>
      <Card>
        <Section title={t('members.inviteTitle')}>
          <Field label={t('members.email')} value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" />
          <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
            {roles.map((item) => (
              <Pill key={item} label={t(`settings.role.${item}`)} active={role === item} onPress={() => setRole(item)} />
            ))}
          </View>
          <Button label={createInvitation.isPending ? t('sending') : t('members.sendInvite')} onPress={() => void handleCreateInvitation()} disabled={!canInviteMember} />
        </Section>
      </Card>

      <Section title={t('members.currentTitle')} subtitle={t('members.currentSubtitle', { count: compactMembersQuery.data?.length ?? 0 })}>
        <View style={{ gap: spacing(2.5) }}>
          {(membersQuery.data ?? []).map((member) => (
            <Card key={member.userId}>
              <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{member.fullName ?? member.email ?? member.userId}</Text>
              <Text style={{ color: colors.textSecondary }}>{t(`settings.role.${member.role}`)} · {t(`members.status.${member.status}`)}</Text>
              <Text style={{ color: colors.textSecondary }}>{member.email ?? t('members.noEmail')}</Text>
              {member.role !== 'owner' && member.userId !== currentUserId ? (
                <Button
                  label={removeMember.isPending ? t('removing') : t('remove')}
                  variant="danger"
                  onPress={() => handleRemoveMember(member)}
                  disabled={removeMember.isPending}
                />
              ) : null}
            </Card>
          ))}
          <Button
            label={t('members.transferOwnership')}
            variant="secondary"
            disabled={!householdId || !firstOtherMember}
            onPress={() => void (householdId && firstOtherMember && transferOwnership.mutateAsync({ householdId, newOwnerId: firstOtherMember.userId }))}
          />
          <Button
            label={t('members.leaveHousehold')}
            variant="danger"
            disabled={!householdId}
            onPress={() => void (householdId && leaveHousehold.mutateAsync(householdId))}
          />
        </View>
      </Section>

      <Section title={t('members.pendingTitle')} subtitle={t('members.pendingSubtitle')}>
        <View style={{ gap: spacing(2.5) }}>
          {(invitationsQuery.data ?? []).map((invite: any) => (
            <Card key={invite.id}>
              <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{invite.email}</Text>
              <Text style={{ color: colors.textSecondary }}>{t(`settings.role.${invite.role}`)} · {t('members.expires', { date: invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : t('members.noDate') })}</Text>
              <Button label={t('members.revoke')} variant="danger" onPress={() => void revokeInvitation.mutateAsync(invite.id)} />
            </Card>
          ))}
        </View>
      </Section>

      <Section title={t('members.myTitle')} subtitle={t('members.mySubtitle')}>
        <View style={{ gap: spacing(2.5) }}>
          {(myInvitationsQuery.data ?? []).map((invite: any) => (
            <Card key={invite.id}>
              <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{invite.household_name}</Text>
              <Text style={{ color: colors.textSecondary }}>{invite.email} · {t(`settings.role.${invite.role}`)}</Text>
              <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
                <Button label={t('accept')} onPress={() => void acceptInvitation.mutateAsync(invite.token)} />
                <Button label={t('decline')} variant="secondary" onPress={() => void declineInvitation.mutateAsync(invite.token)} />
              </View>
            </Card>
          ))}
        </View>
      </Section>
    </Page>
  );
}
