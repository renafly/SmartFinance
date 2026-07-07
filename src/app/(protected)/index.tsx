import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';

import { Page, Card, Section, formatCurrency, formatDate, Button } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import { accountsService } from '../../features/accounts/services/accounts.service';
import { categoriesService } from '../../features/categories/services/categories.service';
import { transactionsService } from '../../features/transactions/services/transaction.service';
import { recurringTransactionsService } from '../../features/recurring-transactions/services/recurring-transactions.service';
import { savingPotsService } from '../../features/saving-pots/services/saving-pots.service';

export default function DashboardScreen() {
  const { t } = useTranslation('common');
  const { profile, householdId, logout } = useAuth();
  const { colors } = useTheme();

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
      title={t('dashboard.title')}
      subtitle={t('dashboard.subtitle', { name: profile?.full_name ? `, ${profile.full_name}` : '' })}
      actions={<Button label={t('logout')} onPress={() => void logout()} variant="secondary" />}
    >
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
          <View style={{ minWidth: 160, flex: 1 }}>
            <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] }}>{t('dashboard.totalBalance')}</Text>
            <Text style={{ color: colors.text, fontSize: typography.fontSize[28], fontWeight: typography.fontWeight.extraBold }}>{formatCurrency(totalBalance)}</Text>
          </View>
          <View style={{ minWidth: 120 }}>
            <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] }}>{t('dashboard.accounts')}</Text>
            <Text style={{ color: colors.text, fontSize: typography.fontSize[24], fontWeight: typography.fontWeight.extraBold }}>{accounts.length}</Text>
          </View>
          <View style={{ minWidth: 120 }}>
            <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] }}>{t('dashboard.categories')}</Text>
            <Text style={{ color: colors.text, fontSize: typography.fontSize[24], fontWeight: typography.fontWeight.extraBold }}>{categories.length}</Text>
          </View>
        </View>
      </Card>

      <Section title={t('dashboard.recentTransactions')} subtitle={t('dashboard.recentTransactionsSubtitle')}>
        <View style={{ gap: spacing(2.5) }}>
          {transactions.length ? (
            transactions.map((item: any) => (
              <Card key={item.id}>
                <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{item.title}</Text>
                <Text style={{ color: colors.textSecondary }}>
                  {item.account?.name ?? t('dashboard.account')} · {item.category?.name ?? t('dashboard.uncategorized')} · {formatDate(item.transaction_date)}
                </Text>
                <Text style={{ color: item.type === 'expense' ? colors.destructive : colors.success, fontWeight: typography.fontWeight.bold }}>
                  {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
                </Text>
              </Card>
            ))
          ) : (
            <Text style={{ color: colors.textSecondary }}>{t('dashboard.noTransactions')}</Text>
          )}
        </View>
      </Section>

      <Section title={t('dashboard.accounts')}>
        <View style={{ gap: spacing(2.5) }}>
          {accounts.map((account: any) => (
            <Card key={account.id}>
              <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{account.name}</Text>
              <Text style={{ color: colors.textSecondary }}>{t(`accounts.types.${account.type}`)} · {account.currency}</Text>
              <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.extraBold }}>{formatCurrency(account.current_balance ?? account.balance ?? 0)}</Text>
            </Card>
          ))}
          <Button label={t('dashboard.viewAllAccounts')} onPress={() => router.push('/accounts' as any)} variant="secondary" />
        </View>
      </Section>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
        <Card>
          <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] }}>{t('dashboard.incomeTx')}</Text>
          <Text style={{ color: colors.text, fontSize: typography.fontSize[24], fontWeight: typography.fontWeight.extraBold }}>{income}</Text>
        </Card>
        <Card>
          <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] }}>{t('dashboard.expenseTx')}</Text>
          <Text style={{ color: colors.text, fontSize: typography.fontSize[24], fontWeight: typography.fontWeight.extraBold }}>{expenses}</Text>
        </Card>
        <Card>
          <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] }}>{t('dashboard.recurring')}</Text>
          <Text style={{ color: colors.text, fontSize: typography.fontSize[24], fontWeight: typography.fontWeight.extraBold }}>{recurring.length}</Text>
        </Card>
        <Card>
          <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] }}>{t('dashboard.savingPots')}</Text>
          <Text style={{ color: colors.text, fontSize: typography.fontSize[24], fontWeight: typography.fontWeight.extraBold }}>{savingPots.length}</Text>
        </Card>
      </View>
    </Page>
  );
}
