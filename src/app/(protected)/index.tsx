import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Page, Card, Section, Pill, formatCurrency, formatDate, Button } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import { accountsService } from '../../features/accounts/services/accounts.service';
import { categoriesService } from '../../features/categories/services/categories.service';
import { transactionsService } from '../../features/transactions/services/transaction.service';
import { recurringTransactionsService } from '../../features/recurring-transactions/services/recurring-transactions.service';
import { savingPotsService } from '../../features/saving-pots/services/saving-pots.service';

export default function DashboardScreen() {
  const { profile, householdId, logout } = useAuth();

  const accountsQuery = useQuery({
    queryKey: ['dashboard', 'accounts', householdId],
    queryFn: () => accountsService.getAccountsWithBalances(householdId!),
    enabled: !!householdId,
  });

  const categoriesQuery = useQuery({
    queryKey: ['dashboard', 'categories', householdId],
    queryFn: () => categoriesService.getCategories(householdId!),
    enabled: !!householdId,
  });

  const transactionsQuery = useQuery({
    queryKey: ['dashboard', 'transactions', householdId],
    queryFn: () => transactionsService.getTransactions(householdId!, { limit: 5 }),
    enabled: !!householdId,
  });

  const recurringQuery = useQuery({
    queryKey: ['dashboard', 'recurring', householdId],
    queryFn: () => recurringTransactionsService.getRecurringTransactions(householdId!),
    enabled: !!householdId,
  });

  const savingPotsQuery = useQuery({
    queryKey: ['dashboard', 'saving-pots', householdId],
    queryFn: () => savingPotsService.getSavingPots(householdId!),
    enabled: !!householdId,
  });

  const accounts = accountsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const recurring = recurringQuery.data ?? [];
  const savingPots = savingPotsQuery.data ?? [];

  const totalBalance = accounts.reduce((sum, account: any) => sum + Number(account.current_balance ?? account.balance ?? 0), 0);
  const expenses = transactions.filter((item: any) => item.type === 'expense').length;
  const income = transactions.filter((item: any) => item.type === 'income').length;

  return (
    <Page
      title="Dashboard"
      subtitle={`Welcome back${profile?.full_name ? `, ${profile.full_name}` : ''}. Your household is ready.`}
      actions={<Button label="Logout" onPress={() => void logout()} variant="secondary" />}
    >
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ minWidth: 160, flex: 1 }}>
            <Text style={{ color: '#94A3B8', textTransform: 'uppercase', fontSize: 12 }}>Total balance</Text>
            <Text style={{ color: '#F8FAFC', fontSize: 28, fontWeight: '800' }}>{formatCurrency(totalBalance)}</Text>
          </View>
          <View style={{ minWidth: 120 }}>
            <Text style={{ color: '#94A3B8', textTransform: 'uppercase', fontSize: 12 }}>Accounts</Text>
            <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800' }}>{accounts.length}</Text>
          </View>
          <View style={{ minWidth: 120 }}>
            <Text style={{ color: '#94A3B8', textTransform: 'uppercase', fontSize: 12 }}>Categories</Text>
            <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800' }}>{categories.length}</Text>
          </View>
        </View>
      </Card>

      <Section title="Quick navigation" subtitle="Jump to the household areas that were in the old app.">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[
            ['Accounts', '/accounts'],
            ['Transactions', '/transactions'],
            ['Transfers', '/transfers'],
            ['Savings', '/savings'],
            ['Recurring', '/recurring'],
            ['Categories', '/categories'],
            ['Members', '/members'],
            ['Settings', '/settings'],
          ].map(([label, href]) => (
            <Pill key={href} label={label} onPress={() => router.push(href as any)} />
          ))}
        </View>
      </Section>

      <Section title="Recent transactions" subtitle="The latest household activity from Supabase.">
        <View style={{ gap: 10 }}>
          {transactions.length ? (
            transactions.map((item: any) => (
              <Card key={item.id}>
                <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{item.title}</Text>
                <Text style={{ color: '#94A3B8' }}>
                  {item.account?.name ?? 'Account'} · {item.category?.name ?? 'Uncategorized'} · {formatDate(item.transaction_date)}
                </Text>
                <Text style={{ color: item.type === 'expense' ? '#FCA5A5' : '#86EFAC', fontWeight: '700' }}>
                  {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
                </Text>
              </Card>
            ))
          ) : (
            <Text style={{ color: '#94A3B8' }}>No transactions yet.</Text>
          )}
        </View>
      </Section>

      <Section title="Accounts">
        <View style={{ gap: 10 }}>
          {accounts.map((account: any) => (
            <Card key={account.id}>
              <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{account.name}</Text>
              <Text style={{ color: '#94A3B8' }}>{account.type} · {account.currency}</Text>
              <Text style={{ color: '#7DD3FC', fontWeight: '800' }}>{formatCurrency(account.current_balance ?? account.balance ?? 0)}</Text>
            </Card>
          ))}
          <Button label="View all accounts" onPress={() => router.push('/accounts' as any)} variant="secondary" />
        </View>
      </Section>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Card>
          <Text style={{ color: '#94A3B8', textTransform: 'uppercase', fontSize: 12 }}>Income tx</Text>
          <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800' }}>{income}</Text>
        </Card>
        <Card>
          <Text style={{ color: '#94A3B8', textTransform: 'uppercase', fontSize: 12 }}>Expense tx</Text>
          <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800' }}>{expenses}</Text>
        </Card>
        <Card>
          <Text style={{ color: '#94A3B8', textTransform: 'uppercase', fontSize: 12 }}>Recurring</Text>
          <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800' }}>{recurring.length}</Text>
        </Card>
        <Card>
          <Text style={{ color: '#94A3B8', textTransform: 'uppercase', fontSize: 12 }}>Saving pots</Text>
          <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800' }}>{savingPots.length}</Text>
        </Card>
      </View>
    </Page>
  );
}
