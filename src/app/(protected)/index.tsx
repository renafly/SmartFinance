import { useMemo } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Page, Section, formatCurrency, formatDate, Button } from '@/components/migrated-page';
import { Badge, EmptyState, MetricCard, Table, TableCell, TableRow } from '@/components/data-surface';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

import { useAuth } from '../../providers/AuthProvider';
import { useHouseholdMemberDetails } from '../../features/households/hooks/useHouseholdMemberDetails';
import { accountsService } from '../../features/accounts/services/accounts.service';
import { transactionsService } from '../../features/transactions/services/transaction.service';
import { savingPotsService } from '../../features/saving-pots/services/saving-pots.service';

type DashboardAccount = {
  id: string;
  name: string;
  type: string;
  currency?: string;
  owner_profile_id?: string | null;
  current_balance?: number | null;
  balance?: number | null;
};

type DashboardPot = {
  id: string;
  name: string;
  balance?: number | null;
  target_amount?: number | null;
  created_by?: string | null;
};

type MemberDetails = {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'accepted';
  fullName: string | null;
  email: string | null;
};

function getPersonLabel(member: MemberDetails | undefined, fallback: string) {
  return member?.fullName?.trim() || member?.email?.trim() || fallback;
}

function sumBalances<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((sum, item) => sum + getValue(item), 0);
}

function getDashboardStatIcon(label: string) {
  switch (label) {
    case 'trackedFunds':
      return 'layers-outline';
    case 'investedTotal':
      return 'trending-up-outline';
    case 'savingsAccountsTotal':
      return 'wallet-outline';
    case 'savingPotsTotal':
      return 'save-outline';
    default:
      return 'ellipse-outline';
  }
}

export default function DashboardScreen() {
  const { t } = useTranslation('common');
  const { profile, householdId, logout } = useAuth();
  const { colors } = useTheme();
  const membersQuery = useHouseholdMemberDetails();

  const accountsQuery = useQuery({
    queryKey: ['dashboard', 'accounts', householdId],
    queryFn: () => accountsService.getAccountsWithBalances(householdId!),
    enabled: !!householdId,
  });

  const transactionsQuery = useQuery({
    queryKey: ['dashboard', 'transactions', householdId],
    queryFn: () => transactionsService.getTransactions(householdId!, { limit: 5 }),
    enabled: !!householdId,
  });

  const savingPotsQuery = useQuery({
    queryKey: ['dashboard', 'saving-pots', householdId],
    queryFn: () => savingPotsService.getSavingPots(householdId!),
    enabled: !!householdId,
  });

  const savingPotBalancesQuery = useQuery({
    queryKey: ['dashboard', 'saving-pot-balances', householdId],
    queryFn: () => savingPotsService.getBalances(householdId!),
    enabled: !!householdId,
  });

  const accounts = (accountsQuery.data ?? []) as DashboardAccount[];
  const transactions = transactionsQuery.data ?? [];
  const savingPots = (savingPotsQuery.data ?? []) as DashboardPot[];
  const savingPotBalances = (savingPotBalancesQuery.data ?? []) as DashboardPot[];
  const members = (membersQuery.data ?? []) as MemberDetails[];

  const memberMap = useMemo(() => {
    const map = new Map<string, MemberDetails>();
    for (const member of members) {
      map.set(member.userId, member);
    }
    return map;
  }, [members]);

  const investmentAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'investment' || account.type === 'ppr'),
    [accounts],
  );

  const savingsAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'savings'),
    [accounts],
  );

  const investmentTotal = useMemo(
    () => sumBalances(investmentAccounts, (account) => Number(account.current_balance ?? account.balance ?? 0)),
    [investmentAccounts],
  );

  const savingsAccountTotal = useMemo(
    () => sumBalances(savingsAccounts, (account) => Number(account.current_balance ?? account.balance ?? 0)),
    [savingsAccounts],
  );

  const savingPotsTotal = useMemo(
    () => sumBalances(savingPotBalances, (pot) => Number(pot.balance ?? 0)),
    [savingPotBalances],
  );

  const trackedTotal = investmentTotal + savingsAccountTotal + savingPotsTotal;

  const memberBreakdown = useMemo(() => {
    const rows = new Map<
      string,
      {
        id: string;
        label: string;
        invested: number;
        savings: number;
        pots: number;
      }
    >();

    const sharedId = '__shared__';
    const ensureRow = (id: string, label: string) => {
      if (!rows.has(id)) {
        rows.set(id, { id, label, invested: 0, savings: 0, pots: 0 });
      }
      return rows.get(id)!;
    };

    for (const member of members) {
      ensureRow(member.userId, getPersonLabel(member, t('dashboard.unnamedPerson')));
    }

    for (const account of investmentAccounts) {
      const ownerId = account.owner_profile_id && memberMap.has(account.owner_profile_id)
        ? account.owner_profile_id
        : sharedId;
      const owner = ownerId === sharedId ? t('dashboard.shared') : getPersonLabel(memberMap.get(ownerId), t('dashboard.unnamedPerson'));
      ensureRow(ownerId, owner).invested += Number(account.current_balance ?? account.balance ?? 0);
    }

    for (const account of savingsAccounts) {
      const ownerId = account.owner_profile_id && memberMap.has(account.owner_profile_id)
        ? account.owner_profile_id
        : sharedId;
      const owner = ownerId === sharedId ? t('dashboard.shared') : getPersonLabel(memberMap.get(ownerId), t('dashboard.unnamedPerson'));
      ensureRow(ownerId, owner).savings += Number(account.current_balance ?? account.balance ?? 0);
    }

    for (const pot of savingPotBalances) {
      const potDefinition = savingPots.find((item) => item.id === pot.id);
      const creatorId = potDefinition?.created_by && memberMap.has(potDefinition.created_by)
        ? potDefinition.created_by
        : sharedId;
      const creator = creatorId === sharedId ? t('dashboard.shared') : getPersonLabel(memberMap.get(creatorId), t('dashboard.unnamedPerson'));
      ensureRow(creatorId, creator).pots += Number(pot.balance ?? 0);
    }

    const orderedRows = members.map((member) => rows.get(member.userId)).filter(Boolean) as Array<{
      id: string;
      label: string;
      invested: number;
      savings: number;
      pots: number;
    }>;

    const sharedRow = rows.get(sharedId);
    if (sharedRow && (sharedRow.invested > 0 || sharedRow.savings > 0 || sharedRow.pots > 0)) {
      orderedRows.push(sharedRow);
    }

    return orderedRows.map((row) => ({
      ...row,
      total: row.invested + row.savings + row.pots,
    }));
  }, [investmentAccounts, memberMap, members, savingPotBalances, savingPots, savingsAccounts, t]);

  const totalInvestmentAccounts = investmentAccounts.length;
  const totalSavingsAccounts = savingsAccounts.length;
  const totalPots = savingPots.length;

  return (
    <Page
      title={t('dashboard.title')}
      subtitle={t('dashboard.subtitle', { name: profile?.full_name ? `, ${profile.full_name}` : '' })}
      actions={<Button label={t('logout')} onPress={() => void logout()} variant="secondary" />}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
        <MetricCard label={t('dashboard.trackedFunds')} value={formatCurrency(trackedTotal)} icon={getDashboardStatIcon('trackedFunds')} />
        <MetricCard label={t('dashboard.investedTotal')} value={formatCurrency(investmentTotal)} icon={getDashboardStatIcon('investedTotal')} />
        <MetricCard label={t('dashboard.savingsAccountsTotal')} value={formatCurrency(savingsAccountTotal)} icon={getDashboardStatIcon('savingsAccountsTotal')} />
        <MetricCard label={t('dashboard.savingPotsTotal')} value={formatCurrency(savingPotsTotal)} icon={getDashboardStatIcon('savingPotsTotal')} />
      </View>

      <Section
        title={t('dashboard.byPersonTitle')}
        subtitle={t('dashboard.byPersonSubtitle')}
      >
        {memberBreakdown.length ? (
          <Table
            columns={[
              { label: t('dashboard.person'), flex: 2 },
              { label: t('dashboard.invested'), align: 'right' },
              { label: t('dashboard.savingsAccounts'), align: 'right' },
              { label: t('dashboard.pots'), align: 'right' },
              { label: t('dashboard.total'), align: 'right' },
            ]}
          >
            {memberBreakdown.map((row) => (
              <TableRow key={row.id}>
                <TableCell flex={2}>
                  <View style={{ gap: spacing(1) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                      <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                      <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold as any, fontSize: typography.fontSize[15] }}>
                        {row.label}
                      </Text>
                    </View>
                    <Badge label={row.id === '__shared__' ? t('dashboard.shared') : t('dashboard.person')} tone={row.id === '__shared__' ? 'neutral' : 'primary'} />
                  </View>
                </TableCell>
                <TableCell align="right">{formatCurrency(row.invested)}</TableCell>
                <TableCell align="right">{formatCurrency(row.savings)}</TableCell>
                <TableCell align="right">{formatCurrency(row.pots)}</TableCell>
                <TableCell align="right">
                  <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.extraBold as any }}>{formatCurrency(row.total)}</Text>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        ) : (
          <EmptyState title={t('dashboard.noPeople')} description={t('dashboard.byPersonSubtitle')} icon="people-outline" />
        )}
      </Section>

      <Section
        title={t('dashboard.investmentAccountsTitle')}
        subtitle={t('dashboard.investmentAccountsSubtitle', { count: totalInvestmentAccounts })}
      >
        {investmentAccounts.length ? (
          <Table
            columns={[
              { label: t('accounts.name'), flex: 2 },
              { label: t('accounts.owner'), flex: 1.2 },
              { label: t('accounts.typeLabel'), flex: 1 },
              { label: t('dashboard.total'), align: 'right' },
            ]}
          >
            {investmentAccounts.map((account) => {
              const owner = account.owner_profile_id ? memberMap.get(account.owner_profile_id) : undefined;

              return (
                <TableRow key={account.id}>
                  <TableCell flex={2}>
                    <View style={{ gap: spacing(1) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                        <Ionicons name={account.type === 'ppr' ? 'shield-checkmark-outline' : 'trending-up-outline'} size={18} color={colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold as any, fontSize: typography.fontSize[15] }}>
                          {account.name}
                        </Text>
                      </View>
                      <Badge label={t(`accounts.types.${account.type}`)} tone="primary" />
                    </View>
                  </TableCell>
                  <TableCell flex={1.2}>
                    <Text style={{ color: colors.textSecondary }}>{getPersonLabel(owner, t('dashboard.shared'))}</Text>
                  </TableCell>
                  <TableCell>
                    <Badge label={t(`accounts.types.${account.type}`)} tone="neutral" />
                  </TableCell>
                  <TableCell align="right">
                    <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.extraBold as any }}>{formatCurrency(account.current_balance ?? account.balance ?? 0)}</Text>
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        ) : (
          <EmptyState title={t('dashboard.noInvestmentAccounts')} icon="trending-up-outline" />
        )}
      </Section>

      <Section
        title={t('dashboard.savingsAccountsTitle')}
        subtitle={t('dashboard.savingsAccountsSubtitle', { count: totalSavingsAccounts })}
      >
        {savingsAccounts.length ? (
          <Table
            columns={[
              { label: t('accounts.name'), flex: 2 },
              { label: t('accounts.owner'), flex: 1.2 },
              { label: t('accounts.typeLabel'), flex: 1 },
              { label: t('dashboard.total'), align: 'right' },
            ]}
          >
            {savingsAccounts.map((account) => {
              const owner = account.owner_profile_id ? memberMap.get(account.owner_profile_id) : undefined;

              return (
                <TableRow key={account.id}>
                  <TableCell flex={2}>
                    <View style={{ gap: spacing(1) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                        <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold as any, fontSize: typography.fontSize[15] }}>
                          {account.name}
                        </Text>
                      </View>
                      <Badge label={t(`accounts.types.${account.type}`)} tone="success" />
                    </View>
                  </TableCell>
                  <TableCell flex={1.2}>
                    <Text style={{ color: colors.textSecondary }}>{getPersonLabel(owner, t('dashboard.shared'))}</Text>
                  </TableCell>
                  <TableCell>
                    <Badge label={t(`accounts.types.${account.type}`)} tone="neutral" />
                  </TableCell>
                  <TableCell align="right">
                    <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.extraBold as any }}>{formatCurrency(account.current_balance ?? account.balance ?? 0)}</Text>
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        ) : (
          <EmptyState title={t('dashboard.noSavingsAccounts')} icon="wallet-outline" />
        )}
      </Section>

      <Section
        title={t('dashboard.savingPotsTitle')}
        subtitle={t('dashboard.savingPotsSubtitle', { count: totalPots })}
      >
        {savingPotBalances.length ? (
          <Table
            columns={[
              { label: t('dashboard.person'), flex: 2 },
              { label: t('dashboard.savingPotsTitle'), flex: 2 },
              { label: t('dashboard.total'), align: 'right' },
            ]}
          >
            {savingPotBalances.map((pot) => {
              const potDefinition = savingPots.find((item) => item.id === pot.id);
              const creator = potDefinition?.created_by ? memberMap.get(potDefinition.created_by) : undefined;

              return (
                <TableRow key={pot.id}>
                  <TableCell flex={2}>
                    <Text style={{ color: colors.textSecondary }}>{getPersonLabel(creator, t('dashboard.shared'))}</Text>
                  </TableCell>
                  <TableCell flex={2}>
                    <View style={{ gap: spacing(1) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                        <Ionicons name="save-outline" size={18} color={colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold as any, fontSize: typography.fontSize[15] }}>
                          {pot.name}
                        </Text>
                      </View>
                      <Badge label={t('dashboard.savingPotsTitle')} tone="neutral" />
                    </View>
                  </TableCell>
                  <TableCell align="right">
                    <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.extraBold as any }}>{formatCurrency(pot.balance ?? 0)}</Text>
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        ) : (
          <EmptyState title={t('dashboard.noSavingPots')} icon="save-outline" />
        )}
      </Section>

      <Section title={t('dashboard.recentTransactions')} subtitle={t('dashboard.recentTransactionsSubtitle')}>
        {transactions.length ? (
          <Table
            columns={[
              { label: t('dashboard.person'), flex: 1.2 },
              { label: t('dashboard.account'), flex: 1.2 },
              { label: t('dashboard.category'), flex: 1.2 },
              { label: t('dashboard.total'), align: 'right' },
            ]}
          >
            {transactions.map((item: any) => {
              const amountTone = item.type === 'expense' ? 'destructive' : 'success';

              return (
                <TableRow key={item.id}>
                  <TableCell flex={1.2}>
                    <View style={{ gap: spacing(1) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                        <Ionicons name={item.type === 'expense' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={18} color={item.type === 'expense' ? colors.destructive : colors.success} />
                      <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold as any }}>{item.title}</Text>
                      </View>
                      <Badge label={t(`transactions.types.${item.type}`)} tone={amountTone} />
                    </View>
                  </TableCell>
                  <TableCell flex={1.2}>
                    <Text style={{ color: colors.textSecondary }}>{item.account?.name ?? t('dashboard.account')}</Text>
                  </TableCell>
                  <TableCell flex={1.2}>
                    <Text style={{ color: colors.textSecondary }}>{item.category?.name ?? t('dashboard.uncategorized')}</Text>
                  </TableCell>
                  <TableCell align="right">
                    <Text style={{ color: item.type === 'expense' ? colors.destructive : colors.success, fontWeight: typography.fontWeight.bold as any }}>
                      {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
                    </Text>
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        ) : (
          <EmptyState title={t('dashboard.noTransactions')} icon="receipt-outline" />
        )}
      </Section>

      <Button label={t('dashboard.viewAllAccounts')} onPress={() => router.push('/accounts' as any)} variant="secondary" />
    </Page>
  );
}
