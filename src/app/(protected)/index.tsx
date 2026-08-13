import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Card, Page, Section, formatCurrency, Button } from '@/components/migrated-page';
import { Badge, EmptyState, MetricCard } from '@/components/data-surface';
import { SelectionOptionRow, SelectionShell, SelectionTrigger } from '@/components/selection-shell';
import { AuthLoadingTransition } from '@/features/auth/components/auth-loading-transition';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useResponsiveMetrics } from '@/theme/responsive';
import { radius } from '@/theme/radius';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';
import { generateColorShades } from '@/shared/lib/color';

import { useAuth } from '../../providers/AuthProvider';
import { useHouseholdMemberDetails } from '../../features/households/hooks/useHouseholdMemberDetails';
import { useDefaultHousehold, useMyHouseholds } from '../../features/households/hooks';
import { accountsService } from '../../features/accounts/services/accounts.service';
import { transactionsService } from '../../features/transactions/services/transaction.service';
import { savingPotsService } from '../../features/saving-pots/services/saving-pots.service';
import { useSavingPotAccountAssignments } from '../../features/saving-pots/hooks';
import { useAllTransactions } from '../../features/transactions/hooks/useTransactions';

import { AllocationDonut } from '../../features/dashboard/components/allocation-donut';
import { AllocationLegend } from '../../features/dashboard/components/allocation-legend';
import { AccountsNetworkSection } from '../../features/dashboard/components/accounts-network-section';
import { getPersonLabel, sumBalances, formatLocalDate } from '../../features/dashboard/utils';
import { buildAccountAccentPalette, buildAccountNetworkNodes } from '../../features/dashboard/network-data';
import type { DashboardAccount, DashboardPot, MemberDetails, AllocationSegment } from '../../features/dashboard/types';

import { useCategories } from '../../features/categories/hooks';

import {
  buildDefaultWageFlowConfig,
  buildOneWageFlowCategoryPerMainCategory,
  calculateWageFlow,
  computeDateRange,
  resolveWageFlowColor,
  type WageFlowCategoryConfig,
} from '@/features/financial-insights';
import {
  WageFlowChart,
  WageFlowCategoryMenu,
  type WageFlowChartBucket,
} from '@/features/financial-insights/components/insight-charts';
import { WageFlowDetailsPanel } from '@/features/financial-insights/components/wage-flow-details-panel';
import {
  WageFlowCategoryEditorModal,
  WageFlowConfigTable,
  buildHierarchicalCategoryOptions,
  blankWageFlowCategory,
  type WageFlowAccountOption,
  type WageFlowCategoryOption,
} from '@/features/financial-insights/components/wage-flow-config-panel';
import {
  useCreateManyWageFlowCategories,
  useCreateWageFlowCategory,
  useDeleteWageFlowCategory,
  useReorderWageFlowCategories,
  useSeedWageFlowCategoryDefaults,
  useUpdateWageFlowCategory,
  useWageFlowCategories,
} from '@/features/financial-insights/hooks/useWageFlowCategories';

function formatSignedCurrency(value: number) {
  return `${value > 0 ? '+' : ''}${formatCurrency(value)}`;
}

type WageFlowRangePreset = '1m' | 'last_month' | '3m' | '6m' | '9m' | '12m' | '24m';

export default function DashboardScreen() {
  const { t } = useTranslation('common');
  const { profile, householdId } = useAuth();
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const toggleHideValues = usePrivacyStore((state) => state.toggleHideValues);
  const membersQuery = useHouseholdMemberDetails();
  const householdsQuery = useMyHouseholds();
  const setDefaultHousehold = useDefaultHousehold();
  const [householdPickerOpen, setHouseholdPickerOpen] = useState(false);
  const currentMonthBounds = useMemo(() => {
    const now = new Date();
    return {
      start: formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }, []);

  const accountsQuery = useQuery({
    queryKey: ['dashboard', 'accounts', householdId],
    queryFn: () => accountsService.getAccountsWithBalances(householdId!),
    enabled: !!householdId,
  });

  const monthlyTransactionsQuery = useQuery({
    queryKey: ['dashboard', 'monthly-account-transactions', householdId, currentMonthBounds],
    queryFn: () => transactionsService.getTransactions(householdId!, {
      from: currentMonthBounds.start,
      to: currentMonthBounds.end,
    }),
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

  // Filtered to expense categories since that's the only kind Wage Flow
  // category rules (and the old category network section) ever needed.
  const categoriesQuery = useCategories('expense');

  const isPreparingDashboard = [
    accountsQuery,
    monthlyTransactionsQuery,
    savingPotsQuery,
    savingPotBalancesQuery,
    membersQuery,
    householdsQuery,
    categoriesQuery,
  ].some((query) => query.isPending && query.fetchStatus === 'fetching');

  const accounts = (accountsQuery.data ?? []) as DashboardAccount[];
  const categories = (categoriesQuery.data ?? []) as any[];
  const savingPots = (savingPotsQuery.data ?? []) as DashboardPot[];
  const savingPotBalances = (savingPotBalancesQuery.data ?? []) as DashboardPot[];
  const members = (membersQuery.data ?? []) as MemberDetails[];
  const households = householdsQuery.data ?? [];
  const currentHousehold = households.find((item: any) => item.id === householdId);
  const currentHouseholdName = currentHousehold?.name?.trim() || t('settings.currentHouseholdLabel');
  const monthlyBalanceChangesByAccount = useMemo(() => {
    const totals = new Map<string, number>();
    for (const transaction of monthlyTransactionsQuery.data ?? []) {
      if (!transaction.account_id) continue;
      const signedAmount = Number(transaction.amount ?? 0) * (transaction.type === 'income' ? 1 : -1);
      totals.set(transaction.account_id, (totals.get(transaction.account_id) ?? 0) + signedAmount);
    }
    return totals;
  }, [monthlyTransactionsQuery.data]);

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

  const investmentMonthlyChange = useMemo(
    () =>
      sumBalances(
        investmentAccounts,
        (account) => monthlyBalanceChangesByAccount.get(account.id) ?? 0,
      ),
    [investmentAccounts, monthlyBalanceChangesByAccount],
  );

  const savingsMonthlyChange = useMemo(
    () =>
      sumBalances(
        savingsAccounts,
        (account) => monthlyBalanceChangesByAccount.get(account.id) ?? 0,
      ),
    [monthlyBalanceChangesByAccount, savingsAccounts],
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

  const accountAccentPalette = useMemo(
    () =>
      buildAccountAccentPalette({
        primary: colors.primary,
        financialPositive: colors.financialPositive,
        financialNeutral: colors.financialNeutral,
        financialGoal: colors.financialGoal,
        financialAttention: colors.financialAttention,
        info: colors.info,
        warning: colors.warning,
        destructive: colors.destructive,
      }),
    [colors.destructive, colors.financialAttention, colors.financialGoal, colors.financialNeutral, colors.financialPositive, colors.info, colors.primary, colors.warning],
  );
  const accountNetworkNodes = useMemo(
    () =>
      buildAccountNetworkNodes(
        accounts,
        memberMap,
        accountAccentPalette,
        t('dashboard.shared'),
        t('dashboard.unnamedPerson'),
      ),
    [accountAccentPalette, accounts, memberMap, t],
  );

  const totalInvestmentAccounts = investmentAccounts.length;
  const totalSavingsAccounts = savingsAccounts.length;
  const totalPots = savingPots.length;

  // ---- Wage Flow (moved here from Insights) --------------------------
  const wageFlowNow = useMemo(() => new Date(), []);
  const [wageFlowRangePreset, setWageFlowRangePreset] = useState<WageFlowRangePreset>('1m');
  const wageFlowRange = useMemo(
    () => computeDateRange(wageFlowRangePreset, wageFlowNow),
    [wageFlowNow, wageFlowRangePreset],
  );
  const wageFlowPeriodLabel = useMemo(() => {
    const monthYear = (dateString: string) =>
      new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      });
    const fromLabel = monthYear(wageFlowRange.from);
    const toLabel = monthYear(wageFlowRange.to);
    return fromLabel === toLabel ? fromLabel : `${fromLabel} – ${toLabel}`;
  }, [wageFlowRange]);
  const wageFlowTransactionsQuery = useAllTransactions({
    from: wageFlowRange.from,
    to: wageFlowRange.to,
  });
  const savingPotAssignmentsQuery = useSavingPotAccountAssignments();

  const potLabelByAccountId = useMemo(() => {
    const potNames = new Map(savingPots.map((pot) => [pot.id, pot.name]));
    const map = new Map<string, string>();
    for (const assignment of (savingPotAssignmentsQuery.data ?? []) as any[]) {
      const potName = potNames.get(assignment.pot_id);
      if (potName) map.set(assignment.account_id, potName);
    }
    return map;
  }, [savingPotAssignmentsQuery.data, savingPots]);
  const wageFlowOwnerLabelByAccountId = useMemo(() => {
    const sharedLabel = t('dashboard.shared');
    const map = new Map<string, string>();
    for (const account of accounts) {
      const owner = account.owner_profile_id
        ? getPersonLabel(memberMap.get(account.owner_profile_id), sharedLabel)
        : sharedLabel;
      map.set(account.id, owner);
    }
    return map;
  }, [accounts, memberMap, t]);

  const wageFlowAccountOptions: WageFlowAccountOption[] = useMemo(
    () =>
      accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        potLabel: potLabelByAccountId.get(account.id) ?? null,
        ownerLabel: wageFlowOwnerLabelByAccountId.get(account.id) ?? t('dashboard.shared'),
        currentBalance: Number(account.current_balance ?? account.balance ?? 0),
      })),
    [accounts, potLabelByAccountId, t, wageFlowOwnerLabelByAccountId],
  );
  const wageFlowPotAccountOptions = useMemo(
    () => wageFlowAccountOptions.filter((account) => ['savings', 'investment', 'ppr'].includes(account.type)),
    [wageFlowAccountOptions],
  );
  const wageFlowAccountLabelById = useMemo(
    () => new Map(wageFlowAccountOptions.map((account) => [account.id, account.potLabel ?? account.name])),
    [wageFlowAccountOptions],
  );
  const wageFlowCategoryOptions = useMemo(
    () => buildHierarchicalCategoryOptions(categories as any[]),
    [categories],
  );

  const wageFlowLabels = useMemo(
    () => ({
      expenses: t('insights.wageFlow.expenses'),
      debtPayments: t('insights.wageFlow.debtPayments'),
      savingsAndGoals: t('insights.wageFlow.savingsAndGoals'),
      discretionary: t('insights.wageFlow.discretionary'),
    }),
    [t],
  );
  const wageFlowCategoriesQuery = useWageFlowCategories();
  const seedWageFlowDefaults = useSeedWageFlowCategoryDefaults();
  const createWageFlowCategory = useCreateWageFlowCategory();
  const createManyWageFlowCategories = useCreateManyWageFlowCategories();
  const updateWageFlowCategory = useUpdateWageFlowCategory();
  const deleteWageFlowCategoryMutation = useDeleteWageFlowCategory();
  const reorderWageFlowCategories = useReorderWageFlowCategories();
  const wageFlowConfig = useMemo(
    () => wageFlowCategoriesQuery.data ?? [],
    [wageFlowCategoriesQuery.data],
  );

  // Seed the household's starting categories the first time Wage Flow loads
  // with none saved yet -- runs once per household.
  const hasSeededWageFlowDefaults = useRef<string | null>(null);
  useEffect(() => {
    if (!householdId) return;
    if (!wageFlowCategoriesQuery.isSuccess) return;
    if ((wageFlowCategoriesQuery.data ?? []).length > 0) return;
    if (!(accountsQuery.isSuccess && categoriesQuery.isSuccess)) return;
    if (hasSeededWageFlowDefaults.current === householdId) return;
    if (seedWageFlowDefaults.isPending) return;

    hasSeededWageFlowDefaults.current = householdId;
    seedWageFlowDefaults.mutate(
      buildDefaultWageFlowConfig({
        accounts: accounts as any,
        categories: categories as any,
        labels: wageFlowLabels,
      }),
    );
  }, [
    accounts,
    accountsQuery.isSuccess,
    categories,
    categoriesQuery.isSuccess,
    householdId,
    seedWageFlowDefaults,
    wageFlowCategoriesQuery.data,
    wageFlowCategoriesQuery.isSuccess,
    wageFlowLabels,
  ]);

  function removeWageFlowCategory(id: string) {
    deleteWageFlowCategoryMutation.mutate(id);
  }
  function moveWageFlowCategory(id: string, direction: 'up' | 'down') {
    const index = wageFlowConfig.findIndex((item) => item.id === id);
    if (index === -1) return;
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= wageFlowConfig.length) return;

    const nextOrder = wageFlowConfig.map((item) => item.id);
    [nextOrder[index], nextOrder[swapWith]] = [nextOrder[swapWith], nextOrder[index]];
    reorderWageFlowCategories.mutate(nextOrder);
  }

  const [wageFlowDraft, setWageFlowDraft] = useState<WageFlowCategoryConfig | null>(null);
  const [wageFlowDraftIsNew, setWageFlowDraftIsNew] = useState(false);
  const [selectedWageFlowKey, setSelectedWageFlowKey] = useState<string | null>(null);
  const [wageFlowMenuCollapsed, setWageFlowMenuCollapsed] = useState(false);
  const [wageFlowDetailsCollapsed, setWageFlowDetailsCollapsed] = useState(false);
  const [wageFlowCategoriesModalOpen, setWageFlowCategoriesModalOpen] = useState(false);

  // Shared by both the chart (tapping a segment) and the category menu
  // (tapping a row) so a repeat tap on the already-selected category always
  // deselects it, the same way in either place.
  function handleSelectWageFlowKey(key: string) {
    setSelectedWageFlowKey((current) => (current === key ? null : key));
  }

  const wageFlow = useMemo(
    () =>
      calculateWageFlow({
        transactions: (wageFlowTransactionsQuery.data ?? []) as any,
        accounts: accounts as any,
        categories: categories as any,
        config: wageFlowConfig,
        range: wageFlowRange,
        otherCategoryLabel: t('insights.wageFlow.otherSubcategory'),
      }),
    [accounts, categories, t, wageFlowConfig, wageFlowRange, wageFlowTransactionsQuery.data],
  );
  const wageFlowResultById = useMemo(
    () => new Map(wageFlow.categories.map((category) => [category.id, category])),
    [wageFlow.categories],
  );
  const wageFlowBuckets: WageFlowChartBucket[] = useMemo(
    () =>
      wageFlow.categories.map((category) => {
        const color = resolveWageFlowColor(
          category.colorToken,
          colors as unknown as Record<string, string>,
          colors.financialNeutral,
        );
        // Split this bucket's flow into one shade per contributing
        // subcategory (largest first, closest to the true base color) so
        // the ribbon/bar visually reflects what makes up the total, only
        // when calculateWageFlow found more than one contributing group.
        const shades =
          category.subcategories.length > 1
            ? generateColorShades(color, category.subcategories.length)
            : [];

        return {
          key: category.id,
          label: category.name,
          icon: (category.icon as WageFlowChartBucket['icon']) || 'ellipse-outline',
          amount: category.amount,
          share: category.share,
          color,
          subcategories: category.subcategories.map((sub, index) => ({
            key: sub.id,
            label: sub.name,
            amount: sub.amount,
            share: sub.share,
            color: shades[index] ?? color,
          })),
          matches: category.matches.map((match) => ({
            id: match.id,
            title: match.title,
            amount: match.amount,
            transactionDate: match.transactionDate,
            accountLabel: wageFlowAccountLabelById.get(match.accountId) ?? match.accountId,
            ownerLabel: wageFlowOwnerLabelByAccountId.get(match.accountId) ?? t('dashboard.shared'),
            isTransfer: match.isTransfer,
          })),
        };
      }),
    [colors, t, wageFlow.categories, wageFlowAccountLabelById, wageFlowOwnerLabelByAccountId],
  );
  const wageFlowTableRows = useMemo(
    () =>
      wageFlowConfig.map((config) => {
        const result = wageFlowResultById.get(config.id);
        return { config, amount: result?.amount ?? 0, share: result?.share ?? 0 };
      }),
    [wageFlowConfig, wageFlowResultById],
  );
  const selectedWageFlowCategory =
    wageFlowBuckets.find((bucket) => bucket.key === selectedWageFlowKey) ?? null;

  function openAddWageFlowCategory() {
    setWageFlowDraft(blankWageFlowCategory());
    setWageFlowDraftIsNew(true);
  }
  // "Add all main categories": a one-time bulk add of one Wage Flow category
  // per main transaction category that doesn't already have one -- not a
  // standing rule, so main categories created afterward aren't picked up
  // automatically. Skips any main category already covered by an existing
  // Wage Flow category's categoryIds, so re-running only fills in gaps.
  function addAllMainCategories() {
    const newConfigs = buildOneWageFlowCategoryPerMainCategory({
      mainCategories: wageFlowCategoryOptions.filter((option) => option.parentId === null),
      existingConfigs: wageFlowConfig,
    });
    if (newConfigs.length === 0) return;
    createManyWageFlowCategories.mutate({
      configs: newConfigs,
      startingSortOrder: wageFlowConfig.length,
    });
  }
  function openEditWageFlowCategory(id: string) {
    const existing = wageFlowConfig.find((item) => item.id === id);
    if (!existing) return;
    setWageFlowDraft({ ...existing });
    setWageFlowDraftIsNew(false);
  }
  function closeWageFlowEditor() {
    setWageFlowDraft(null);
  }
  function saveWageFlowDraft() {
    if (!wageFlowDraft) return;
    if (wageFlowDraftIsNew) {
      createWageFlowCategory.mutate({ config: wageFlowDraft, sortOrder: wageFlowConfig.length });
    } else {
      updateWageFlowCategory.mutate({ id: wageFlowDraft.id, config: wageFlowDraft });
    }
    setWageFlowDraft(null);
  }
  function deleteWageFlowDraft() {
    if (!wageFlowDraft) return;
    removeWageFlowCategory(wageFlowDraft.id);
    setWageFlowDraft(null);
  }
  // ---- end Wage Flow ---------------------------------------------------

  if (isPreparingDashboard) return <AuthLoadingTransition />;

  return (
    <Page
      title={t('dashboard.title')}
      subtitle={t('dashboard.subtitle', { name: profile?.full_name ? `, ${profile.full_name}` : '' })}
      actions={
        <SelectionTrigger
          label={t('dashboard.household')}
          valueLabel={currentHouseholdName}
          placeholder={t('dashboard.selectHousehold')}
          iconName="home-outline"
          disabled={households.length <= 1 || setDefaultHousehold.isPending}
          onPress={() => setHouseholdPickerOpen(true)}
        />
      }
      overlay={
        // Fixed in place over the whole screen (not just scrolled content)
        // so it stays reachable no matter how far down the dashboard you've
        // scrolled, and masks every currency figure on the page at once via
        // the shared privacy store — not just the account network diagram.
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: hideValues }}
          accessibilityLabel={hideValues ? t('dashboard.showValues') : t('dashboard.hideValues')}
          onPress={toggleHideValues}
          style={({ pressed }) => [styles.privacyToggle, { borderColor: colors.primary, backgroundColor: colors.primary }, pressed && styles.pressed]}
        >
          <Ionicons name={hideValues ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.primaryForeground} />
        </Pressable>
      }
    >
      <View style={[styles.heroCard, { backgroundColor: colors.primarySoft, borderColor: colors.primary, flexDirection: responsive.isPhone ? 'column' : 'row', padding: responsive.isPhone ? spacing(4) : spacing(5) }]}>
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
            {displayCurrency(formatCurrency(netWorthTotal), hideValues)}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {t('dashboard.allocationSubtitle')}
          </Text>
          <View style={[styles.heroActions, responsive.isPhone && styles.heroActionsPhone]}>
            <Button label={t('dashboard.viewAllAccounts')} onPress={() => router.push('/accounts' as any)} />
            <Button label={t('dashboard.savingPotsTitle')} onPress={() => router.push('/savings' as any)} variant="secondary" />
          </View>
        </View>
        <View style={[styles.allocationPanel, { flexDirection: responsive.isPhone ? 'column' : 'row' }]}>
          <AllocationDonut segments={allocationSegments} total={netWorthTotal} />
          <AllocationLegend segments={allocationSegments} total={netWorthTotal} />
        </View>
      </View>

      {/* On desktop the network diagram has a lot of empty space around it
          (it's capped at a square ~460px), so the 5 metric cards move into
          a rail beside it instead of a full-width row underneath — better
          use of the extra horizontal room. Phone/tablet keep the original
          stacked order, just as two separate blocks. */}
      <View style={responsive.isDesktop ? styles.networkMetricsRow : styles.networkMetricsStacked}>
        <View style={responsive.isDesktop ? styles.networkColumn : styles.fullWidthColumn}>
          <Section
            title={t('dashboard.networkTitle')}
            subtitle={t('dashboard.networkSubtitle')}
            collapsible
          >
            <AccountsNetworkSection nodes={accountNetworkNodes} totalValue={netWorthTotal} />
          </Section>
        </View>

        <View style={responsive.isDesktop ? styles.metricRail : [styles.metricGrid, responsive.isPhone && styles.metricGridPhone]}>
          <MetricCard label={t('dashboard.savingsAccounts')} value={displayCurrency(formatCurrency(savingsAccountTotal), hideValues)} icon="wallet-outline" hint={`${totalSavingsAccounts} ${t('dashboard.account').toLowerCase()}`} />
          <MetricCard label={t('dashboard.invested')} value={displayCurrency(formatCurrency(investmentTotal), hideValues)} icon="trending-up-outline" hint={`${totalInvestmentAccounts} ${t('dashboard.account').toLowerCase()}`} />
          <MetricCard label={t('dashboard.pots')} value={displayCurrency(formatCurrency(savingPotsTotal), hideValues)} icon="flag-outline" hint={`${totalPots} ${t('dashboard.savingPotsTitle').toLowerCase()}`} />
          <MetricCard
            label={t('dashboard.investedThisMonth')}
            value={displayCurrency(formatSignedCurrency(investmentMonthlyChange), hideValues)}
            icon="trending-up-outline"
            hint={`${totalInvestmentAccounts} ${t('dashboard.account').toLowerCase()}`}
          />
          <MetricCard
            label={t('dashboard.addedToSavingsThisMonth')}
            value={displayCurrency(formatSignedCurrency(savingsMonthlyChange), hideValues)}
            icon="add-circle-outline"
            hint={`${totalSavingsAccounts} ${t('dashboard.account').toLowerCase()}`}
          />
        </View>
      </View>

      <Card>
        <Section
          title={t('insights.wageFlow.title')}
          subtitle={t('insights.wageFlow.subtitle')}
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('insights.wageFlow.configTitle')}
              onPress={() => setWageFlowCategoriesModalOpen(true)}
              style={({ pressed }) => [
                {
                  width: spacing(9),
                  height: spacing(9),
                  borderRadius: radius.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceMuted,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          }
        >
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('insights.wageFlow.periodLabel')}
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing(2),
              marginBottom: spacing(3),
            }}
          >
            {(
              [
                ['1m', t('insights.wageFlow.range1Month')],
                ['last_month', t('insights.wageFlow.rangeLastMonth')],
                ['3m', t('insights.wageFlow.range3Months')],
                ['6m', t('insights.wageFlow.range6Months')],
                ['9m', t('insights.wageFlow.range9Months')],
                ['12m', t('insights.wageFlow.range12Months')],
                ['24m', t('insights.wageFlow.range24Months')],
              ] as const
            ).map(([value, label]) => {
              const selected = wageFlowRangePreset === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setWageFlowRangePreset(value)}
                  style={{
                    paddingHorizontal: spacing(3),
                    paddingVertical: spacing(1.5),
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primarySoft : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 13,
                      fontWeight: selected
                        ? typography.fontWeight.bold
                        : typography.fontWeight.regular,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {wageFlow.income > 0 ? (
            <View
              style={{
                flexDirection: responsive.isPhone ? 'column' : 'row',
                gap: spacing(3),
                alignItems: responsive.isPhone ? 'stretch' : 'flex-start',
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <WageFlowChart
                  income={wageFlow.income}
                  buckets={wageFlowBuckets}
                  periodLabel={wageFlowPeriodLabel}
                  selectedKey={selectedWageFlowKey}
                  onSelectKey={handleSelectWageFlowKey}
                />
              </View>
              <View
                style={
                  responsive.isPhone
                    ? { width: '100%' }
                    : { width: wageFlowMenuCollapsed ? spacing(12) : spacing(52) }
                }
              >
                <WageFlowCategoryMenu
                  buckets={wageFlowBuckets}
                  selectedKey={selectedWageFlowKey}
                  onSelectKey={handleSelectWageFlowKey}
                  collapsed={wageFlowMenuCollapsed}
                  onToggleCollapsed={() => setWageFlowMenuCollapsed((c) => !c)}
                />
              </View>
              <View
                style={
                  responsive.isPhone
                    ? { width: '100%' }
                    : { width: wageFlowDetailsCollapsed ? spacing(12) : spacing(80) }
                }
              >
                <WageFlowDetailsPanel
                  category={selectedWageFlowCategory}
                  collapsed={wageFlowDetailsCollapsed}
                  onToggleCollapsed={() => setWageFlowDetailsCollapsed((c) => !c)}
                />
              </View>
            </View>
          ) : (
            <EmptyState title={t('insights.wageFlow.noIncome')} />
          )}
        </Section>
      </Card>

      <SelectionShell
        visible={wageFlowCategoriesModalOpen}
        title={t('insights.wageFlow.configTitle')}
        subtitle={t('insights.wageFlow.configSubtitle')}
        closeLabel={t('insights.wageFlow.close')}
        onClose={() => setWageFlowCategoriesModalOpen(false)}
      >
        <WageFlowConfigTable
          rows={wageFlowTableRows}
          categoryOptions={wageFlowCategoryOptions}
          onEdit={openEditWageFlowCategory}
          onRemove={removeWageFlowCategory}
          onMoveUp={(id) => moveWageFlowCategory(id, 'up')}
          onMoveDown={(id) => moveWageFlowCategory(id, 'down')}
          onAdd={openAddWageFlowCategory}
          onAddAllMainCategories={addAllMainCategories}
        />
      </SelectionShell>

      <WageFlowCategoryEditorModal
        visible={wageFlowDraft !== null}
        draft={wageFlowDraft}
        isNew={wageFlowDraftIsNew}
        accounts={wageFlowAccountOptions}
        potAccounts={wageFlowPotAccountOptions}
        categoryOptions={wageFlowCategoryOptions}
        onChange={(patch) => setWageFlowDraft((current) => (current ? { ...current, ...patch } : current))}
        onClose={closeWageFlowEditor}
        onSave={saveWageFlowDraft}
        onDelete={deleteWageFlowDraft}
      />

      <SelectionShell
        visible={householdPickerOpen}
        title={t('dashboard.selectHousehold')}
        closeLabel={t('cancel')}
        onClose={() => setHouseholdPickerOpen(false)}
      >
        <View style={{ gap: spacing(2) }}>
          {households.map((household: any) => (
            <SelectionOptionRow
              key={household.id}
              title={household.name}
              subtitle={household.id === householdId ? t('settings.default') : undefined}
              active={household.id === householdId}
              iconName="home-outline"
              onPress={() => {
                if (household.id === householdId) {
                  setHouseholdPickerOpen(false);
                  return;
                }

                void setDefaultHousehold.mutateAsync(household.id).then(() => setHouseholdPickerOpen(false));
              }}
            />
          ))}
        </View>
      </SelectionShell>

      <View style={styles.privacyToggleSpacer} />
    </Page>
  );
}

const styles = StyleSheet.create({
  privacyToggle: {
    position: 'absolute',
    right: spacing(6),
    bottom: spacing(6),
    zIndex: 10,
    width: spacing(12),
    height: spacing(12),
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  privacyToggleSpacer: {
    height: spacing(16),
  },
  pressed: {
    opacity: 0.75,
  },
  heroCard: {
    width: '100%',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: radius.xl,
    gap: spacing(5),
    flexDirection: 'row',
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
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginTop: spacing(1),
  },
  heroActionsPhone: {
    width: '100%',
  },
  allocationPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing(4),
    minWidth: 0,
  },
  networkMetricsRow: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(4),
  },
  networkMetricsStacked: {
    width: '100%',
    alignSelf: 'stretch',
    gap: spacing(5),
  },
  networkColumn: {
    flex: 1.3,
    minWidth: 0,
  },
  fullWidthColumn: {
    width: '100%',
  },
  metricRail: {
    flex: 1,
    minWidth: spacing(52),
    maxWidth: spacing(72),
    gap: spacing(3),
  },
  metricGrid: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(3),
  },
  metricGridPhone: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    gap: spacing(2),
  },
});
