import { useState } from 'react';
import { Text, View } from 'react-native';

import { Page, Card, Section, Field, Button, Pill, formatCurrency } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import { useAccounts } from '../../features/accounts/hooks';
import { useCreateTransfer } from '../../features/transfers/hooks';

export default function TransfersScreen() {
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccounts();
  const createTransfer = useCreateTransfer();
  const accounts = accountsQuery.data ?? [];

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('Transfer');
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
    <Page title="Transfers" subtitle="Move money between accounts using the transfer RPC.">
      <Card>
        <Section title="Create transfer">
          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <Field label="Date" value={date} onChangeText={setDate} />
          <Field label="Notes" value={notes} onChangeText={setNotes} />
          <Text style={{ color: '#CBD5E1', fontWeight: '600' }}>From</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {accounts.map((account: any) => (
              <Pill key={account.id} label={`${account.name} (${formatCurrency(account.current_balance ?? account.balance ?? 0)})`} active={fromAccountId === account.id} onPress={() => setFromAccountId(account.id)} />
            ))}
          </View>
          <Text style={{ color: '#CBD5E1', fontWeight: '600' }}>To</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {accounts.map((account: any) => (
              <Pill key={account.id} label={account.name} active={toAccountId === account.id} onPress={() => setToAccountId(account.id)} />
            ))}
          </View>
          <Button label={createTransfer.isPending ? 'Transferring...' : 'Create transfer'} onPress={() => void handleCreate()} disabled={!canCreateTransfer} />
        </Section>
      </Card>

      <Section title="How it works" subtitle="Transfers create two linked transaction rows through the transfer RPC.">
        <Card>
          <Text style={{ color: '#CBD5E1' }}>The source account is debited as an expense and the destination account is credited as income, keeping balances consistent.</Text>
        </Card>
      </Section>
    </Page>
  );
}
