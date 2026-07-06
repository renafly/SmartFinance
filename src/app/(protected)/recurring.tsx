import { useState } from 'react';
import { Text, View } from 'react-native';

import { Page, Card, Section, Field, Button, Pill, formatCurrency, formatDate } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import { useAccounts } from '../../features/accounts/hooks';
import { useTopLevelCategories } from '../../features/categories/hooks';
import { useCreateRecurringTransaction, useDeleteRecurringTransaction, useRecurringTransactions, useToggleRecurringTransaction } from '../../features/recurring-transactions/hooks';

const frequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export default function RecurringScreen() {
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccounts();
  const recurringQuery = useRecurringTransactions();
  const categoriesQuery = useTopLevelCategories('expense');
  const createRecurring = useCreateRecurringTransaction();
  const toggleRecurring = useToggleRecurringTransaction();
  const deleteRecurring = useDeleteRecurringTransaction();

  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [frequency, setFrequency] = useState<(typeof frequencies)[number]>('monthly');
  const [nextRun, setNextRun] = useState(new Date().toISOString().slice(0, 10));
  const parsedAmount = Number(amount);
  const canCreateRecurring =
    !createRecurring.isPending &&
    Boolean(householdId) &&
    Boolean(profile?.id) &&
    Boolean(accountId) &&
    title.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(nextRun);

  async function handleCreate() {
    if (!householdId || !profile?.id || !accountId || !title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    await createRecurring.mutateAsync({
      household_id: householdId,
      account_id: accountId,
      category_id: categoryId,
      title: title.trim(),
      amount: parsedAmount,
      type,
      frequency,
      next_run: nextRun,
      created_by: profile.id,
    } as any);

    setTitle('');
    setAmount('');
  }

  return (
    <Page title="Recurring" subtitle="Schedule repeated transactions and manage their activation.">
      <Card>
        <Section title="Create recurring transaction">
          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <Field label="Next run" value={nextRun} onChangeText={setNextRun} />
          <Text style={{ color: '#CBD5E1', fontWeight: '600' }}>Type</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['income', 'expense'] as const).map((item) => (
              <Pill key={item} label={item} active={type === item} onPress={() => setType(item)} />
            ))}
          </View>
          <Text style={{ color: '#CBD5E1', fontWeight: '600' }}>Frequency</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {frequencies.map((item) => (
              <Pill key={item} label={item} active={frequency === item} onPress={() => setFrequency(item)} />
            ))}
          </View>
          <Text style={{ color: '#CBD5E1', fontWeight: '600' }}>Account</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {(accountsQuery.data ?? []).map((account: any) => (
              <Pill key={account.id} label={account.name} active={accountId === account.id} onPress={() => setAccountId(account.id)} />
            ))}
          </View>
          <Text style={{ color: '#CBD5E1', fontWeight: '600' }}>Category</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pill label="None" active={!categoryId} onPress={() => setCategoryId(null)} />
            {(categoriesQuery.data ?? []).map((category: any) => (
              <Pill key={category.id} label={category.name} active={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
            ))}
          </View>
          <Button label={createRecurring.isPending ? 'Creating...' : 'Create recurring rule'} onPress={() => void handleCreate()} disabled={!canCreateRecurring} />
        </Section>
      </Card>

      <Section title="Recurring rules" subtitle={`${(recurringQuery.data ?? []).length} rules in this household.`}>
        <View style={{ gap: 10 }}>
          {(recurringQuery.data ?? []).map((item: any) => (
            <Card key={item.id}>
              <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{item.title}</Text>
              <Text style={{ color: '#94A3B8' }}>{item.frequency} · next {formatDate(item.next_run)}</Text>
              <Text style={{ color: '#7DD3FC', fontWeight: '800' }}>{formatCurrency(item.amount)}</Text>
              <Text style={{ color: item.is_active ? '#86EFAC' : '#FCA5A5', fontWeight: '600' }}>{item.is_active ? 'Active' : 'Inactive'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button
                  label={item.is_active ? 'Deactivate' : 'Activate'}
                  variant="secondary"
                  onPress={() => void toggleRecurring.mutateAsync({ id: item.id, active: !item.is_active })}
                />
                <Button label="Delete" variant="danger" onPress={() => void deleteRecurring.mutateAsync(item.id)} />
              </View>
            </Card>
          ))}
        </View>
      </Section>
    </Page>
  );
}
