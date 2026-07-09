import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

import { Page, Card, Section, Field, Button, Pill, formatCurrency } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import { useAccounts } from '../../features/accounts/hooks';
import { useCreateTransfer } from '../../features/transfers/hooks';

export default function TransfersScreen() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccounts();
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
          <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold }}>{t('transfers.fromAccount')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {accounts.map((account: any) => (
              <Pill key={account.id} label={`${account.name} (${formatCurrency(account.current_balance ?? account.balance ?? 0)})`} active={fromAccountId === account.id} onPress={() => setFromAccountId(account.id)} />
            ))}
          </View>
          <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold }}>{t('transfers.toAccount')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {accounts.map((account: any) => (
              <Pill key={account.id} label={account.name} active={toAccountId === account.id} onPress={() => setToAccountId(account.id)} />
            ))}
          </View>
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
