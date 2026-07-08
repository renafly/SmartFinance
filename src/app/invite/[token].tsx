import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';

import { Button, Card, Page, Section } from '@/components/migrated-page';
import { GoogleSignInButton } from '@/features/auth';
import { useAcceptHouseholdInvitation } from '@/features/households/hooks';
import { householdsService } from '@/features/households/services/households.service';
import { useAuth } from '@/providers/AuthProvider';

function getToken(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function InviteScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const params = useLocalSearchParams<{
    token?: string | string[];
  }>();
  const token = useMemo(() => getToken(params.token), [params.token]);
  const { session, restoring, logout } = useAuth();
  const acceptInvitation = useAcceptHouseholdInvitation();
  const [accepted, setAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoAcceptAttemptedRef = useRef<string | null>(null);

  const invitationsQuery = useQuery({
    queryKey: ['my-invitations', session?.user.id],
    queryFn: () => householdsService.getMyInvitations(),
    enabled: Boolean(session?.user.id) && !restoring,
  });

  const invitationDetailsQuery = useQuery({
    queryKey: ['household-invitation-details', token],
    queryFn: () => householdsService.getInvitationDetails(token),
    enabled: Boolean(token),
  });

  const invitation = invitationsQuery.data?.find((item) => item.token === token) ?? null;
  const invitationDetails = invitationDetailsQuery.data ?? null;
  const householdName = invitationDetails?.household_name || invitation?.household_name || t('invite.thisHousehold');
  const ownerName = invitationDetails?.owner_name || t('invite.someone');
  const role = invitationDetails?.role || invitation?.role;
  const expiresAt = invitationDetails?.expires_at || invitation?.expires_at;
  const hasFriendlyDetails = Boolean(invitationDetails?.household_name || invitation?.household_name);
  const sessionKey = session?.user.id ?? 'anonymous';

  const acceptCurrentInvite = useCallback(async () => {
    if (!token || !session || accepted || acceptInvitation.isPending) return;

    setAccepted(true);
    setErrorMessage(null);

    try {
      await acceptInvitation.mutateAsync(token);
      router.replace('/(protected)/settings');
    } catch (error) {
      setAccepted(false);
      setErrorMessage(error instanceof Error ? error.message : t('invite.unknownError'));
    }
  }, [acceptInvitation, accepted, session, t, token]);

  useEffect(() => {
    if (!token || restoring || !session || accepted || acceptInvitation.isPending) return;
    if (autoAcceptAttemptedRef.current === `${token}:${sessionKey}`) return;

    autoAcceptAttemptedRef.current = `${token}:${sessionKey}`;

    void acceptCurrentInvite();
  }, [acceptCurrentInvite, acceptInvitation.isPending, accepted, restoring, session, sessionKey, token]);

  if (!token) {
    return (
      <Page title={t('invite.invalidTitle')} subtitle={t('invite.invalidMessage')}>
        <Card>
          <Text style={{ color: colors.textSecondary }}>{t('invite.invalidDescription')}</Text>
        </Card>
        <Button label={t('invite.goHome')} onPress={() => router.replace('/(public)')} />
      </Page>
    );
  }

  return (
      <Page
      title={session ? t('invite.acceptTitle') : t('invite.welcomeTitle')}
      subtitle={
        hasFriendlyDetails
          ? t('invite.friendlySubtitle', { ownerName, householdName })
          : t('invite.subtitle')
      }
    >
      <Card>
        <Section title={t('invite.sectionTitle')}>
          <Text style={{ color: colors.textSecondary }}>
            {hasFriendlyDetails
              ? t('invite.friendlyBody', { ownerName, householdName })
              : t('invite.signInBody')}
          </Text>
          {role ? (
            <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.bold }}>
              {t('invite.joinAs', { role })}
            </Text>
          ) : null}
          {expiresAt ? (
            <Text style={{ color: colors.textSecondary }}>
              {t('invite.expires', { date: new Date(expiresAt).toLocaleDateString() })}
            </Text>
          ) : null}
          {!hasFriendlyDetails ? (
            <Text style={{ color: colors.textSecondary }}>
              {t('invite.lookupAfterSignIn')}
            </Text>
          ) : null}
          {errorMessage?.includes('does not belong to your account email') ? (
            <Text style={{ color: colors.warning, fontWeight: typography.fontWeight.bold }}>
              {t('invite.wrongAccount')}
            </Text>
          ) : null}
          {errorMessage ? <Text style={{ color: colors.destructive }}>{errorMessage}</Text> : null}
          {accepted ? <Text style={{ color: colors.success, fontWeight: typography.fontWeight.bold }}>{t('invite.acceptedMessage')}</Text> : null}
        </Section>
      </Card>

      {!session ? (
        <Card>
          <Section title={t('invite.signInTitle')}>
            <Text style={{ color: colors.textSecondary }}>
              {t('invite.signInMessage')}
            </Text>
            <GoogleSignInButton />
          </Section>
        </Card>
      ) : null}

      {session && !accepted ? (
        <>
          <Button
            label={acceptInvitation.isPending ? t('invite.accepting') : t('continue')}
            onPress={() => {
              autoAcceptAttemptedRef.current = `${token}:${sessionKey}`;
              void acceptCurrentInvite();
            }}
            disabled={acceptInvitation.isPending}
          />
          <Button
            label={t('invite.switchAccount')}
            onPress={() => {
              autoAcceptAttemptedRef.current = null;
              setAccepted(false);
              setErrorMessage(null);
              void logout();
            }}
          />
        </>
      ) : null}
    </Page>
  );
}
