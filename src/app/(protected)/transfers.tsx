import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

import { Page, Card, Section, Field, Button } from '@/components/migrated-page';
import { GroupedAccountSelect } from '@/components/grouped-account-select';
import { useAuth } from '../../providers/AuthProvider';
import { useAccountsWithBalances } from '../../features/accounts/hooks';
import { useHouseholdMemberDetails } from '../../features/households/hooks';
import { useCreateTransfer } from '../../features/transfers/hooks';

export default function TransfersScreen() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const createTransfer = useCreateTransfer();
  const accounts = accountsQuery.data ?? [];

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState(() => t('transfers.defaultTitle'));
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const parsedAmount = Number(amount);
  const canCreateTransfer =
    !createTransfer.isPending &&
    Boolean(householdId) &&
    Boolean(profile?.id) &&
    Boolean(fromAccountId) &&
    Boolean(toAccountId) &&
    fromAccountId !== toAccountId &&
    title.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date);

  async function handleCreate() {
    if (!householdId || !profile?.id || !fromAccountId || !toAccountId || fromAccountId === toAccountId || !title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    await createTransfer.mutateAsync({
      householdId,
      fromAccountId,
      toAccountId,
      amount: parsedAmount,
      title: title.trim(),
      notes: notes.trim(),
      transactionDate: date,
      createdBy: profile.id,
    });

    setAmount('');
    setNotes('');
  }

  return (
    <Page title={t('transfers.title')} subtitle={t('transfers.subtitle')}>
      <Card>
        <Section title={t('transfers.createTitle')}>
          <Field label={t('transfers.formTitle')} value={title} onChangeText={setTitle} />
          <Field label={t('transfers.formAmount')} value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <Field label={t('transfers.formDate')} value={date} onChangeText={setDate} />
          <Field label={t('transfers.formNotes')} value={notes} onChangeText={setNotes} />
          <GroupedAccountSelect
            label={t('transfers.fromAccount')}
            accounts={accounts as any}
            members={(membersQuery.data ?? []).filter((member) => member.status === 'accepted') as any}
            value={fromAccountId}
            placeholder={t('transfers.fromAccount')}
            hint={t('transfers.fromAccount')}
            onChange={setFromAccountId}
            allowedAccountIds={toAccountId ? accounts.filter((account: any) => account.id !== toAccountId).map((account: any) => account.id) : undefined}
            closeLabel={t('close', { defaultValue: 'Close' })}
            sharedLabel={t('dashboard.shared')}
            unassignedLabel={t('settings.unnamedUser')}
            typeLabels={{
              bank: t('accounts.types.bank'),
              cash: t('accounts.types.cash'),
              savings: t('accounts.types.savings'),
              credit_card: t('accounts.types.credit_card'),
              investment: t('accounts.types.investment'),
              ppr: t('accounts.types.ppr'),
            }}
          />
          <GroupedAccountSelect
            label={t('transfers.toAccount')}
            accounts={accounts as any}
            members={(membersQuery.data ?? []).filter((member) => member.status === 'accepted') as any}
            value={toAccountId}
            placeholder={t('transfers.toAccount')}
            hint={t('transfers.toAccount')}
            onChange={setToAccountId}
            allowedAccountIds={fromAccountId ? accounts.filter((account: any) => account.id !== fromAccountId).map((account: any) => account.id) : undefined}
            closeLabel={t('close', { defaultValue: 'Close' })}
            sharedLabel={t('dashboard.shared')}
            unassignedLabel={t('settings.unnamedUser')}
            typeLabels={{
              bank: t('accounts.types.bank'),
              cash: t('accounts.types.cash'),
              savings: t('accounts.types.savings'),
              credit_card: t('accounts.types.credit_card'),
              investment: t('accounts.types.investment'),
              ppr: t('accounts.types.ppr'),
            }}
          />
          <Button label={createTransfer.isPending ? t('transfers.formCreating') : t('transfers.formCreate')} onPress={() => void handleCreate()} disabled={!canCreateTransfer} />
        </Section>
      </Card>

      <Section title={t('transfers.howItWorksTitle')} subtitle={t('transfers.howItWorksSubtitle')}>
        <Card>
          <Text style={{ color: colors.textSecondary }}>{t('transfers.howItWorksBody')}</Text>
        </Card>
      </Section>
    </Page>
  );
}
