import { useMemo } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Page, Card, Section, formatCurrency, formatDate, Button } from '@/components/migrated-page';
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
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
          <View style={{ minWidth: 170, flex: 1, gap: spacing(1) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
              <Ionicons name={getDashboardStatIcon('trackedFunds')} size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] }}>{t('dashboard.trackedFunds')}</Text>
            </View>
            <Text style={{ color: colors.text, fontSize: typography.fontSize[28], fontWeight: typography.fontWeight.extraBold }}>{formatCurrency(trackedTotal)}</Text>
          </View>
          <View style={{ minWidth: 170, flex: 1, gap: spacing(1) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
              <Ionicons name={getDashboardStatIcon('investedTotal')} size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] }}>{t('dashboard.investedTotal')}</Text>
            </View>
            <Text style={{ color: colors.text, fontSize: typography.fontSize[28], fontWeight: typography.fontWeight.extraBold }}>{formatCurrency(investmentTotal)}</Text>
          </View>
          <View style={{ minWidth: 170, flex: 1, gap: spacing(1) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
              <Ionicons name={getDashboardStatIcon('savingsAccountsTotal')} size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] }}>{t('dashboard.savingsAccountsTotal')}</Text>
            </View>
            <Text style={{ color: colors.text, fontSize: typography.fontSize[28], fontWeight: typography.fontWeight.extraBold }}>{formatCurrency(savingsAccountTotal)}</Text>
          </View>
          <View style={{ minWidth: 170, flex: 1, gap: spacing(1) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
              <Ionicons name={getDashboardStatIcon('savingPotsTotal')} size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] }}>{t('dashboard.savingPotsTotal')}</Text>
            </View>
            <Text style={{ color: colors.text, fontSize: typography.fontSize[28], fontWeight: typography.fontWeight.extraBold }}>{formatCurrency(savingPotsTotal)}</Text>
          </View>
        </View>
      </Card>

      <Section
        title={t('dashboard.byPersonTitle')}
        subtitle={t('dashboard.byPersonSubtitle')}
      >
        <View style={{ gap: spacing(2.5) }}>
          {memberBreakdown.length ? (
            memberBreakdown.map((row) => (
              <Card key={row.id}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), alignItems: 'center' }}>
                  <View style={{ flex: 1, minWidth: 180, gap: spacing(1) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                      <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                      <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[15] }}>
                        {row.label}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] }}>
                      {t('dashboard.person')}
                    </Text>
                  </View>
                  <View style={{ minWidth: 110 }}>
                    <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[11] }}>{t('dashboard.invested')}</Text>
                    <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold }}>{formatCurrency(row.invested)}</Text>
                  </View>
                  <View style={{ minWidth: 110 }}>
                    <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[11] }}>{t('dashboard.savingsAccounts')}</Text>
                    <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold }}>{formatCurrency(row.savings)}</Text>
                  </View>
                  <View style={{ minWidth: 110 }}>
                    <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[11] }}>{t('dashboard.pots')}</Text>
                    <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold }}>{formatCurrency(row.pots)}</Text>
                  </View>
                  <View style={{ minWidth: 120 }}>
                    <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[11] }}>{t('dashboard.total')}</Text>
                    <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.extraBold }}>{formatCurrency(row.total)}</Text>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Text style={{ color: colors.textSecondary }}>{t('dashboard.noPeople')}</Text>
          )}
        </View>
      </Section>

      <Section
        title={t('dashboard.investmentAccountsTitle')}
        subtitle={t('dashboard.investmentAccountsSubtitle', { count: totalInvestmentAccounts })}
      >
        <View style={{ gap: spacing(2.5) }}>
          {investmentAccounts.length ? (
            investmentAccounts.map((account) => {
              const owner = account.owner_profile_id ? memberMap.get(account.owner_profile_id) : undefined;
              return (
                <Card key={account.id}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), alignItems: 'center' }}>
                  <View style={{ flex: 1, minWidth: 180, gap: spacing(1) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                        <Ionicons name={account.type === 'ppr' ? 'shield-checkmark-outline' : account.type === 'investment' ? 'trending-up-outline' : 'wallet-outline'} size={18} color={colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[15] }}>
                          {account.name}
                        </Text>
                      </View>
                      <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] }}>
                        {t(`accounts.types.${account.type}`)} · {getPersonLabel(owner, t('dashboard.shared'))}
                      </Text>
                    </View>
                    <Text style={{ color: colors.primary, fontSize: typography.fontSize[16], fontWeight: typography.fontWeight.extraBold }}>
                      {formatCurrency(account.current_balance ?? account.balance ?? 0)}
                    </Text>
                  </View>
                </Card>
              );
            })
          ) : (
            <Text style={{ color: colors.textSecondary }}>{t('dashboard.noInvestmentAccounts')}</Text>
          )}
        </View>
      </Section>

      <Section
        title={t('dashboard.savingsAccountsTitle')}
        subtitle={t('dashboard.savingsAccountsSubtitle', { count: totalSavingsAccounts })}
      >
        <View style={{ gap: spacing(2.5) }}>
          {savingsAccounts.length ? (
            savingsAccounts.map((account) => {
              const owner = account.owner_profile_id ? memberMap.get(account.owner_profile_id) : undefined;
              return (
                <Card key={account.id}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), alignItems: 'center' }}>
                  <View style={{ flex: 1, minWidth: 180, gap: spacing(1) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                        <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[15] }}>
                          {account.name}
                        </Text>
                      </View>
                      <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] }}>
                        {t(`accounts.types.${account.type}`)} · {getPersonLabel(owner, t('dashboard.shared'))}
                      </Text>
                    </View>
                    <Text style={{ color: colors.primary, fontSize: typography.fontSize[16], fontWeight: typography.fontWeight.extraBold }}>
                      {formatCurrency(account.current_balance ?? account.balance ?? 0)}
                    </Text>
                  </View>
                </Card>
              );
            })
          ) : (
            <Text style={{ color: colors.textSecondary }}>{t('dashboard.noSavingsAccounts')}</Text>
          )}
        </View>
      </Section>

      <Section
        title={t('dashboard.savingPotsTitle')}
        subtitle={t('dashboard.savingPotsSubtitle', { count: totalPots })}
      >
        <View style={{ gap: spacing(2.5) }}>
          {savingPotBalances.length ? (
            savingPotBalances.map((pot) => {
              const potDefinition = savingPots.find((item) => item.id === pot.id);
              const creator = potDefinition?.created_by ? memberMap.get(potDefinition.created_by) : undefined;
              return (
                <Card key={pot.id}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), alignItems: 'center' }}>
                  <View style={{ flex: 1, minWidth: 180, gap: spacing(1) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                        <Ionicons name="save-outline" size={18} color={colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[15] }}>
                          {pot.name}
                        </Text>
                      </View>
                      <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] }}>
                        {getPersonLabel(creator, t('dashboard.shared'))}
                      </Text>
                    </View>
                    <Text style={{ color: colors.primary, fontSize: typography.fontSize[16], fontWeight: typography.fontWeight.extraBold }}>
                      {formatCurrency(pot.balance ?? 0)}
                    </Text>
                  </View>
                </Card>
              );
            })
          ) : (
            <Text style={{ color: colors.textSecondary }}>{t('dashboard.noSavingPots')}</Text>
          )}
        </View>
      </Section>

      <Section title={t('dashboard.recentTransactions')} subtitle={t('dashboard.recentTransactionsSubtitle')}>
        <View style={{ gap: spacing(2.5) }}>
          {transactions.length ? (
            transactions.map((item: any) => (
              <Card key={item.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                  <Ionicons name={item.type === 'expense' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={18} color={item.type === 'expense' ? colors.destructive : colors.success} />
                  <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{item.title}</Text>
                </View>
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

      <Button label={t('dashboard.viewAllAccounts')} onPress={() => router.push('/accounts' as any)} variant="secondary" />
    </Page>
  );
}
