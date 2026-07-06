import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

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
  useRevokeHouseholdInvitation,
  useTransferHouseholdOwnership,
  useAcceptHouseholdInvitation,
} from '../../features/households/hooks';

const roles = ['owner', 'admin', 'member'] as const;

export default function MembersScreen() {
  const { householdId } = useAuth();
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
  const leaveHousehold = useLeaveHousehold();

  const firstOtherMember = useMemo(() => (membersQuery.data ?? []).find((member) => member.role !== 'owner'), [membersQuery.data]);
  const canInviteMember = !createInvitation.isPending && email.trim().length > 0;

  async function handleCreateInvitation() {
    if (!householdId || !email.trim()) return;

    await createInvitation.mutateAsync({
      householdId,
      email: email.trim(),
      role,
    });

    setEmail('');
  }

  return (
    <Page title="Members" subtitle="Invite people, manage membership, and transfer ownership.">
      <Card>
        <Section title="Invite a member">
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {roles.map((item) => (
              <Pill key={item} label={item} active={role === item} onPress={() => setRole(item)} />
            ))}
          </View>
          <Button label={createInvitation.isPending ? 'Sending...' : 'Send invite'} onPress={() => void handleCreateInvitation()} disabled={!canInviteMember} />
        </Section>
      </Card>

      <Section title="Current members" subtitle={`${compactMembersQuery.data?.length ?? 0} accepted members.`}>
        <View style={{ gap: 10 }}>
          {(membersQuery.data ?? []).map((member) => (
            <Card key={member.userId}>
              <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{member.fullName ?? member.email ?? member.userId}</Text>
              <Text style={{ color: '#94A3B8' }}>{member.role} · {member.status}</Text>
              <Text style={{ color: '#CBD5E1' }}>{member.email ?? 'No email'}</Text>
            </Card>
          ))}
          <Button
            label="Transfer ownership to first non-owner"
            variant="secondary"
            disabled={!householdId || !firstOtherMember}
            onPress={() => void (householdId && firstOtherMember && transferOwnership.mutateAsync({ householdId, newOwnerId: firstOtherMember.userId }))}
          />
          <Button
            label="Leave household"
            variant="danger"
            disabled={!householdId}
            onPress={() => void (householdId && leaveHousehold.mutateAsync(householdId))}
          />
        </View>
      </Section>

      <Section title="Invitations" subtitle="Household invitations issued from the app.">
        <View style={{ gap: 10 }}>
          {(invitationsQuery.data ?? []).map((invite: any) => (
            <Card key={invite.id}>
              <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{invite.email}</Text>
              <Text style={{ color: '#94A3B8' }}>{invite.role} · expires {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : 'n/a'}</Text>
              <Button label="Revoke" variant="danger" onPress={() => void revokeInvitation.mutateAsync(invite.id)} />
            </Card>
          ))}
        </View>
      </Section>

      <Section title="My invitations" subtitle="Invitations addressed to the signed-in user.">
        <View style={{ gap: 10 }}>
          {(myInvitationsQuery.data ?? []).map((invite: any) => (
            <Card key={invite.id}>
              <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{invite.household_name}</Text>
              <Text style={{ color: '#94A3B8' }}>{invite.email} · {invite.role}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Button label="Accept" onPress={() => void acceptInvitation.mutateAsync(invite.token)} />
                <Button label="Decline" variant="secondary" onPress={() => void declineInvitation.mutateAsync(invite.token)} />
              </View>
            </Card>
          ))}
        </View>
      </Section>
    </Page>
  );
}
