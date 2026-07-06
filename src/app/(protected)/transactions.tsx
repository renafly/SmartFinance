import { useState } from 'react';
import { Text, View } from 'react-native';

import { Page, Card, Section, Field, Button, Pill, formatCurrency, formatDate } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import { useAccounts } from '../../features/accounts/hooks';
import { useTopLevelCategories } from '../../features/categories/hooks';
import { useTransactions } from '../../features/transactions/hooks/useTransactions';
import { useCreateTransaction } from '../../features/transactions/hooks/useCreateTransaction';
import { useDeleteTransaction } from '../../features/transactions/hooks/useDeleteTransaction';

export default function TransactionsScreen() {
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccounts();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [filtersType, setFiltersType] = useState<'all' | 'income' | 'expense'>('all');

  const transactionsQuery = useTransactions(filtersType === 'all' ? {} : { type: filtersType });
  const categoriesQuery = useTopLevelCategories(type);

  const accounts = accountsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const firstAccount = accounts[0]?.id ?? '';
  const parsedAmount = Number(amount);
  const effectiveAccountId = accountId || firstAccount;
  const canCreateTransaction =
    !createTransaction.isPending &&
    Boolean(householdId) &&
    Boolean(profile?.id) &&
    Boolean(effectiveAccountId) &&
    title.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date);

  async function handleCreate() {
    if (!householdId || !profile?.id || !effectiveAccountId || !title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    await createTransaction.mutateAsync({
      household_id: householdId,
      created_by: profile.id,
      account_id: effectiveAccountId,
      category_id: categoryId,
      type,
      title: title.trim(),
      amount: parsedAmount,
      notes: notes || null,
      transaction_date: date,
    } as any);

    setTitle('');
    setAmount('');
    setNotes('');
    setCategoryId(null);
  }

  return (
    <Page title="Transactions" subtitle="Create and review household income and expenses.">
      <Card>
        <Section title="Filters" subtitle="Switch between all, income, and expense transactions.">
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {(['all', 'income', 'expense'] as const).map((item) => (
              <Pill key={item} label={item} active={filtersType === item} onPress={() => setFiltersType(item)} />
            ))}
          </View>
        </Section>
      </Card>

      <Card>
        <Section title="Create transaction" subtitle="This uses the existing transaction mutation and schema.">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['income', 'expense'] as const).map((item) => (
              <Pill key={item} label={item} active={type === item} onPress={() => setType(item)} />
            ))}
          </View>
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="Salary / Groceries" />
          <Field label="Amount" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" />
          <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" />
          <Text style={{ color: '#CBD5E1', fontWeight: '600' }}>Accounts</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {accounts.map((account: any) => (
              <Pill key={account.id} label={account.name} active={accountId === account.id} onPress={() => setAccountId(account.id)} />
            ))}
          </View>
          <Text style={{ color: '#CBD5E1', fontWeight: '600' }}>Categories</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pill label="None" active={!categoryId} onPress={() => setCategoryId(null)} />
            {categories.map((category: any) => (
              <Pill key={category.id} label={category.name} active={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
            ))}
          </View>
          <Button label={createTransaction.isPending ? 'Saving...' : 'Create transaction'} onPress={() => void handleCreate()} disabled={!canCreateTransaction} />
        </Section>
      </Card>

      <Section title="Latest transactions" subtitle={`${transactions.length} rows from the current household.`}>
        <View style={{ gap: 10 }}>
          {transactions.map((item: any) => (
            <Card key={item.id}>
              <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{item.title}</Text>
              <Text style={{ color: '#94A3B8' }}>{item.account?.name ?? 'Account'} · {item.category?.name ?? 'Uncategorized'} · {formatDate(item.transaction_date)}</Text>
              <Text style={{ color: item.type === 'expense' ? '#FCA5A5' : '#86EFAC', fontWeight: '800' }}>
                {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
              </Text>
              <Button label="Delete" onPress={() => void deleteTransaction.mutateAsync(item.id)} variant="danger" />
            </Card>
          ))}
        </View>
      </Section>
    </Page>
  );
}
