import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Field } from '@/components/migrated-page';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import {
  useAcceptHouseholdInvitation,
  useCreateHousehold,
  useDeclineHouseholdInvitation,
  useMyHouseholdInvitations,
  useMyHouseholds,
} from '@/features/households/hooks';
import type { MyHouseholdInvitation } from '@/repositories/households.repository';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Shown on the Dashboard to a signed-in user whose household membership was
 * loaded successfully and is empty. Lets them accept a pending invitation or
 * create a household, through the same RPC-backed hooks used elsewhere
 * (create_household / accept_household_invitation).
 *
 * The caller decides *whether* to render this (membership loaded, no error,
 * householdId === null). This component only guards against creating a
 * duplicate household: it re-checks the user's memberships, blocks repeat
 * submissions, and after a successful create/join waits for the session to
 * pick up the new membership instead of offering the form again.
 */
export function HouseholdSetupCard() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const { refreshSession } = useAuth();

  const householdsQuery = useMyHouseholds();
  const invitationsQuery = useMyHouseholdInvitations();
  const createHousehold = useCreateHousehold();
  const acceptInvitation = useAcceptHouseholdInvitation();
  const declineInvitation = useDeclineHouseholdInvitation();

  const [householdName, setHouseholdName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const submittingRef = useRef(false);

  const invitations = (invitationsQuery.data ?? []) as MyHouseholdInvitation[];
  const existingHouseholds = householdsQuery.data ?? [];
  const isBusy = createHousehold.isPending || acceptInvitation.isPending || submittingRef.current;
  // Don't allow creating until the secondary membership check has answered,
  // so a slow/racing session refresh can't lead to a second household.
  const membershipCheckPending = householdsQuery.isPending && householdsQuery.fetchStatus === 'fetching';

  const textStyles = {
    title: { color: colors.text, fontSize: typography.fontSize[18], fontWeight: String(typography.fontWeight.bold) as any },
    subtitle: { color: colors.textSecondary, fontSize: typography.fontSize[14], lineHeight: typography.lineHeight[20] },
    label: { color: colors.text, fontSize: typography.fontSize[15], fontWeight: String(typography.fontWeight.semibold) as any },
    error: { color: colors.destructive, fontSize: typography.fontSize[13] },
    divider: { color: colors.textSecondary, textAlign: 'center' as const, fontSize: typography.fontSize[13] },
  };
  const row = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing(2) };

  async function runOnce(action: () => Promise<unknown>) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    try {
      await action();
      setCompleted(true);
    } catch (nextError) {
      setError(errorMessage(nextError, t('householdSetup.genericError')));
    } finally {
      submittingRef.current = false;
    }
  }

  function handleCreate() {
    const name = householdName.trim();
    if (!name) {
      setError(t('householdSetup.error'));
      return;
    }
    void runOnce(() => createHousehold.mutateAsync(name));
  }

  function handleAccept(token: string) {
    void runOnce(() => acceptInvitation.mutateAsync(token));
  }

  function handleDecline(token: string) {
    setError(null);
    declineInvitation.mutate(token, {
      onError: (nextError) => setError(errorMessage(nextError, t('householdSetup.genericError'))),
    });
  }

  const header = (
    <View style={{ flexDirection: 'row', gap: spacing(3), alignItems: 'flex-start' }}>
      <View
        style={{
          width: spacing(10),
          height: spacing(10),
          borderRadius: spacing(5),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primarySoft,
        }}
      >
        <Ionicons name="home-outline" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: spacing(1) }}>
        <Text style={textStyles.title}>{t('householdSetup.title')}</Text>
        <Text style={textStyles.subtitle}>{t('householdSetup.subtitle')}</Text>
      </View>
    </View>
  );

  // Created/joined: the membership exists now; AuthProvider's refreshSession
  // (fired by the mutation hooks) will flip householdId and this card unmounts.
  // If that refresh is slow or fails, offer a manual reload -- never the form.
  if (completed || existingHouseholds.length > 0) {
    return (
      <Card>
        {header}
        <View style={{ gap: spacing(2) }} testID="household-setup-finishing">
          <Text style={textStyles.label}>
            {completed ? t('householdSetup.finishing') : t('householdSetup.alreadyMemberTitle')}
          </Text>
          {!completed ? <Text style={textStyles.subtitle}>{t('householdSetup.alreadyMemberSubtitle')}</Text> : null}
          <View style={row}>
            <Button label={t('householdSetup.reload')} variant="secondary" onPress={() => void refreshSession()} />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card>
      {header}

      {invitationsQuery.isError ? (
        <View style={{ gap: spacing(2) }}>
          <Text style={textStyles.error}>{t('householdSetup.invitationsLoadError')}</Text>
          <View style={row}>
            <Button label={t('householdSetup.retry')} variant="secondary" onPress={() => void invitationsQuery.refetch()} />
          </View>
        </View>
      ) : null}

      {invitations.length > 0 ? (
        <View style={{ gap: spacing(3) }}>
          <View style={{ gap: spacing(1) }}>
            <Text style={textStyles.label}>{t('householdSetup.invitationsTitle')}</Text>
            <Text style={textStyles.subtitle}>{t('householdSetup.invitationsSubtitle')}</Text>
          </View>
          {invitations.map((invite) => (
            <View
              key={invite.id}
              style={{
                gap: spacing(2),
                padding: spacing(3),
                borderRadius: spacing(3),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surfaceMuted,
              }}
            >
              <Text style={textStyles.label}>{invite.household_name}</Text>
              <View style={row}>
                <Button
                  label={t('householdSetup.accept')}
                  onPress={() => handleAccept(invite.token)}
                  disabled={isBusy || declineInvitation.isPending}
                />
                <Button
                  label={t('householdSetup.decline')}
                  variant="secondary"
                  onPress={() => handleDecline(invite.token)}
                  disabled={isBusy || declineInvitation.isPending}
                />
              </View>
            </View>
          ))}
          <Text style={textStyles.divider}>{t('householdSetup.orDivider')}</Text>
        </View>
      ) : null}

      <View style={{ gap: spacing(2) }}>
        <View style={{ gap: spacing(1) }}>
          <Text style={textStyles.label}>{t('householdSetup.createTitle')}</Text>
          <Text style={textStyles.subtitle}>{t('householdSetup.createSubtitle')}</Text>
        </View>
        <Field
          label={t('settings.householdName')}
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder={t('householdSetup.namePlaceholder')}
          onSubmitEditing={handleCreate}
          editable={!isBusy}
        />
        <View style={row}>
          <Button
            label={t('householdSetup.create')}
            onPress={handleCreate}
            disabled={isBusy || membershipCheckPending || !householdName.trim()}
          />
        </View>
      </View>

      {error ? <Text style={textStyles.error}>{error}</Text> : null}
    </Card>
  );
}
