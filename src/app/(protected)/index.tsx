import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { Page, Section, formatCurrency, formatDate, Button } from '@/components/migrated-page';
import { Badge, EmptyState, Table, TableCell, TableRow } from '@/components/data-surface';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useResponsiveMetrics } from '@/theme/responsive';
import { radius } from '@/theme/radius';

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
  initial_balance?: number | null;
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

type AllocationKey = 'invested' | 'savings' | 'pots';

type AllocationSegment = {
  key: AllocationKey;
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function getPercent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
}

function AllocationDonut({ segments, total }: { segments: AllocationSegment[]; total: number }) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const size = responsive.isPhone ? spacing(34) : spacing(40);
  const strokeWidth = spacing(3.25);
  const radiusValue = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const visibleSegments = total > 0
    ? segments.filter((segment) => Number.isFinite(segment.value) && segment.value > 0)
    : [];
  let offset = 0;

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {visibleSegments.map((segment) => {
          const share = segment.value / total;
          const dashLength = Math.max(circumference * share, 0);
          const gapLength = Math.max(circumference - dashLength, 0);
          const dashOffset = -offset;
          offset += dashLength;

          return (
            <Circle
              key={segment.key}
              cx={size / 2}
              cy={size / 2}
              r={radiusValue}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={[dashLength, gapLength]}
              strokeDashoffset={dashOffset}
              strokeLinecap={visibleSegments.length > 1 ? 'round' : 'butt'}
              fill="transparent"
            />
          );
        })}
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={[styles.donutCenterLabel, { color: colors.textSecondary }]}>{getPercent(segments[0]?.value ?? 0, total)}%</Text>
        <Text style={[styles.donutCenterText, { color: colors.text }]}>{segments[0]?.label}</Text>
      </View>
    </View>
  );
}

function AllocationLegend({ segments, total }: { segments: AllocationSegment[]; total: number }) {
  const { colors } = useTheme();

  return (
    <View style={styles.legendList}>
      {segments.map((segment) => (
        <View key={segment.key} style={[styles.legendItem, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.legendIcon, { backgroundColor: segment.color }]}>
            <Ionicons name={segment.icon} size={16} color={colors.primaryForeground} />
          </View>
          <View style={styles.legendCopy}>
            <Text style={[styles.legendLabel, { color: colors.text }]}>{segment.label}</Text>
            <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
              {formatCurrency(segment.value)} - {getPercent(segment.value, total)}%
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function PersonBreakdownBar({
  row,
  segments,
}: {
  row: { id: string; label: string; invested: number; savings: number; pots: number; total: number };
  segments: AllocationSegment[];
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.personBarCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      <View style={styles.personBarHeader}>
        <View style={styles.personBarTitle}>
          <Ionicons name={row.id === '__shared__' ? 'people-outline' : 'person-circle-outline'} size={18} color={colors.primary} />
          <Text style={[styles.personBarName, { color: colors.text }]}>{row.label}</Text>
        </View>
        <Text style={[styles.personBarTotal, { color: colors.primary }]}>{formatCurrency(row.total)}</Text>
      </View>
      <View style={[styles.stackedBarTrack, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {segments.map((segment) => {
          const value = row[segment.key];
          if (value <= 0 || row.total <= 0) return null;

          return (
            <View
              key={segment.key}
              style={[
                styles.stackedBarSegment,
                {
                  backgroundColor: segment.color,
                  flexGrow: value,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.personBarLegend}>
        {segments.map((segment) => (
          <Text key={segment.key} style={[styles.personBarLegendText, { color: colors.textSecondary }]}>
            {segment.label}: {formatCurrency(row[segment.key])}
          </Text>
        ))}
      </View>
    </View>
  );
}

function GoalMeter({ balance, target }: { balance: number; target?: number | null }) {
  const { colors } = useTheme();
  const progress = target && target > 0 ? Math.min(balance / target, 1) : 0;
  const progressPercent = Math.round(progress * 100);

  return (
    <View style={styles.goalMeter}>
      <View style={[styles.goalTrack, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.goalFill, { backgroundColor: colors.success, flexGrow: progress }]} />
        <View style={{ flexGrow: 1 - progress }} />
      </View>
      <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
        {target && target > 0 ? `${progressPercent}% - ${formatCurrency(balance)} / ${formatCurrency(target)}` : formatCurrency(balance)}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation('common');
  const { profile, householdId, logout } = useAuth();
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
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
    () =>
      accounts
        .filter((account) => account.type === 'investment' || account.type === 'ppr')
        .slice()
        .sort((a, b) => {
          const typeOrder = (value: string) => (value === 'investment' ? 0 : value === 'ppr' ? 1 : 99);
          const ownerA = a.owner_profile_id ? getPersonLabel(memberMap.get(a.owner_profile_id), t('dashboard.shared')) : t('dashboard.shared');
          const ownerB = b.owner_profile_id ? getPersonLabel(memberMap.get(b.owner_profile_id), t('dashboard.shared')) : t('dashboard.shared');
          return (
            typeOrder(a.type) - typeOrder(b.type) ||
            ownerA.localeCompare(ownerB) ||
            a.name.localeCompare(b.name)
          );
        }),
    [accounts, memberMap, t],
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

  const netWorthTotal = investmentTotal + savingsAccountTotal;

  const allocationSegments = useMemo<AllocationSegment[]>(
    () => [
      {
        key: 'invested',
        label: t('dashboard.invested'),
        value: investmentTotal,
        color: colors.primary,
        icon: 'trending-up-outline',
      },
      {
        key: 'savings',
        label: t('dashboard.savingsAccounts'),
        value: savingsAccountTotal,
        color: colors.success,
        icon: 'file-tray-full-outline',
      },
    ],
    [colors.primary, colors.success, investmentTotal, savingsAccountTotal, t],
  );

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
      total: row.invested + row.savings,
    }));
  }, [investmentAccounts, memberMap, members, savingPotBalances, savingPots, savingsAccounts, t]);

  const memberBreakdownTotals = useMemo(
    () =>
      memberBreakdown.reduce(
        (totals, row) => ({
          invested: totals.invested + row.invested,
          savings: totals.savings + row.savings,
          pots: totals.pots + row.pots,
          total: totals.total + row.total,
        }),
        {
          invested: 0,
          savings: 0,
          pots: 0,
          total: 0,
        },
      ),
    [memberBreakdown],
  );

  const totalInvestmentAccounts = investmentAccounts.length;
  const totalSavingsAccounts = savingsAccounts.length;
  const totalPots = savingPots.length;

  return (
    <Page
      title={t('dashboard.title')}
      subtitle={t('dashboard.subtitle', { name: profile?.full_name ? `, ${profile.full_name}` : '' })}
      actions={<Button label={t('logout')} onPress={() => void logout()} variant="secondary" />}
    >
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            flexDirection: responsive.isPhone ? 'column' : 'row',
            padding: responsive.isPhone ? spacing(4) : spacing(5),
          },
        ]}
      >
        <View style={styles.heroCopy}>
          <Badge label={t('dashboard.netWorthScope')} tone="primary" />
          <Text
            style={[
              styles.heroLabel,
              {
                color: colors.textSecondary,
                fontSize: responsive.isPhone ? typography.fontSize[12] : typography.fontSize[13],
              },
            ]}
          >
            {t('dashboard.netWorthTotal')}
          </Text>
          <Text
            style={[
              styles.heroValue,
              {
                color: colors.text,
                fontSize: responsive.isPhone ? typography.fontSize[34] : typography.fontSize[48],
                lineHeight: responsive.isPhone ? typography.lineHeight[40] : typography.lineHeight[52],
              },
            ]}
          >
            {formatCurrency(netWorthTotal)}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {t('dashboard.allocationSubtitle')}
          </Text>
        </View>
        <View style={[styles.allocationPanel, { flexDirection: responsive.isPhone ? 'column' : 'row' }]}>
          <AllocationDonut segments={allocationSegments} total={netWorthTotal} />
          <AllocationLegend segments={allocationSegments} total={netWorthTotal} />
        </View>
      </View>

      <Section
        title={t('dashboard.byPersonTitle')}
        subtitle={t('dashboard.byPersonSubtitle')}
      >
        {memberBreakdown.length ? (
          <View style={styles.personBreakdown}>
            {memberBreakdown.map((row) => (
              <PersonBreakdownBar key={row.id} row={row} segments={allocationSegments} />
            ))}
            <Table
              columns={[
                { label: t('dashboard.person'), flex: 2 },
                { label: t('dashboard.invested'), align: 'right' },
                { label: t('dashboard.savingsAccounts'), align: 'right' },
                { label: t('dashboard.pots'), align: 'right' },
                { label: t('dashboard.accountTotal'), align: 'right' },
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
              {memberBreakdown.length > 1 ? (
                <TableRow>
                  <TableCell flex={2}>
                    <View style={{ gap: spacing(1) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                        <Ionicons name="calculator-outline" size={18} color={colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold as any, fontSize: typography.fontSize[15] }}>
                          {t('dashboard.verticalTotal')}
                        </Text>
                      </View>
                      <Badge label={t('dashboard.total')} tone="primary" />
                    </View>
                  </TableCell>
                  <TableCell align="right">
                    <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold as any }}>{formatCurrency(memberBreakdownTotals.invested)}</Text>
                  </TableCell>
                  <TableCell align="right">
                    <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold as any }}>{formatCurrency(memberBreakdownTotals.savings)}</Text>
                  </TableCell>
                  <TableCell align="right">
                    <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold as any }}>{formatCurrency(memberBreakdownTotals.pots)}</Text>
                  </TableCell>
                  <TableCell align="right">
                    <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.extraBold as any }}>{formatCurrency(memberBreakdownTotals.total)}</Text>
                  </TableCell>
                </TableRow>
              ) : null}
            </Table>
          </View>
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
              { label: t('accounts.initialBalance'), align: 'right' },
              { label: t('dashboard.total'), align: 'right' },
              { label: t('dashboard.difference', { defaultValue: t('dashboard.total') }), align: 'right' },
            ]}
          >
            {investmentAccounts.map((account) => {
              const owner = account.owner_profile_id ? memberMap.get(account.owner_profile_id) : undefined;
              const initialBalance = Number(account.initial_balance ?? 0);
              const currentBalance = Number(account.current_balance ?? account.balance ?? 0);
              const balanceDifference = currentBalance - initialBalance;

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
                    <Text style={{ color: colors.textSecondary }}>{formatCurrency(initialBalance)}</Text>
                  </TableCell>
                  <TableCell align="right">
                    <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.extraBold as any }}>{formatCurrency(currentBalance)}</Text>
                  </TableCell>
                  <TableCell align="right">
                    <Text
                      style={{
                        color: balanceDifference > 0 ? colors.success : balanceDifference < 0 ? colors.destructive : colors.textSecondary,
                        fontWeight: typography.fontWeight.extraBold as any,
                      }}
                    >
                      {balanceDifference > 0 ? '+' : ''}
                      {formatCurrency(balanceDifference)}
                    </Text>
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
                        <Ionicons name="file-tray-full-outline" size={18} color={colors.primary} />
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
          <EmptyState title={t('dashboard.noSavingsAccounts')} icon="file-tray-full-outline" />
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
                      <GoalMeter balance={Number(pot.balance ?? 0)} target={potDefinition?.target_amount} />
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

const styles = StyleSheet.create({
  heroCard: {
    width: '100%',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: radius.xl,
    gap: spacing(5),
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing(2),
    alignItems: 'flex-start',
  },
  heroLabel: {
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing[11],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  heroValue: {
    fontWeight: typography.fontWeight.extraBold as any,
  },
  heroSubtitle: {
    fontSize: typography.fontSize[14],
    lineHeight: typography.lineHeight[20],
  },
  allocationPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing(4),
    minWidth: 0,
  },
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  donutCenterLabel: {
    fontSize: typography.fontSize[28],
    lineHeight: typography.lineHeight[32],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  donutCenterText: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
    fontWeight: typography.fontWeight.bold as any,
  },
  legendList: {
    gap: spacing(2),
    minWidth: spacing(48),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(2),
  },
  legendIcon: {
    width: spacing(8),
    height: spacing(8),
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing(0.5),
  },
  legendLabel: {
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  legendValue: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  personBreakdown: {
    width: '100%',
    alignSelf: 'stretch',
    gap: spacing(3),
  },
  personBarCard: {
    width: '100%',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(3),
    gap: spacing(2),
  },
  personBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
  },
  personBarTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    minWidth: 0,
  },
  personBarName: {
    fontSize: typography.fontSize[15],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  personBarTotal: {
    fontSize: typography.fontSize[15],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  stackedBarTrack: {
    minHeight: spacing(3),
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  stackedBarSegment: {},
  personBarLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  personBarLegendText: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  goalMeter: {
    gap: spacing(1),
  },
  goalTrack: {
    minHeight: spacing(2.5),
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  goalFill: {},
  goalLabel: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
});
