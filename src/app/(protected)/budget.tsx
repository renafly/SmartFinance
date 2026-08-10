import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Page, Card, Section, Field, Button, Pill, formatCurrency } from '@/components/migrated-page';
import { EmptyState } from '@/components/data-surface';
import { type DestinationSelection } from '@/components/grouped-destination-select';
import { MonthPickerField } from '@/components/date-picker-field';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { getPersistentString, setPersistentString } from '@/shared/lib/persistent-storage';
import { useAuth } from '../../providers/AuthProvider';
import { useAccounts, useAccountsWithBalances } from '../../features/accounts/hooks';
import { useHouseholdMemberDetails, useMyHouseholds } from '../../features/households/hooks';
import { useRecurringTransactions } from '../../features/recurring-transactions/hooks';
import { useSavingPotAccountAssignments, useSavingPots } from '../../features/saving-pots/hooks';
import {
  useCancelMonthlyBudgetRun,
  useConfirmMonthlyBudgetRun,
  useDeleteMonthlyBudgetRunTransactions,
  useMonthlyBudgetIncomeInputs,
  useMonthlyBudgetRuns,
  useMonthlyBudgetWorkspace,
  useSaveMonthlyBudgetConfiguration,
  useSaveMonthlyBudgetDraft,
  type MonthlyBudgetIncomeDraft,
  type MonthlyBudgetRuleDraft,
} from '../../features/monthly-budget/hooks';
import { monthlyBudgetService, type MonthlyBudgetPreview } from '../../features/monthly-budget/services/monthly-budget.service';
import type { BudgetAccountLike, BudgetMemberLike } from '../../features/monthly-budget/types';
import { getMemberAccentColor, getMemberLabel, getSectionBadgeIcon } from '../../features/monthly-budget/ui-utils';
import { BudgetRuleCard } from '../../features/monthly-budget/components/budget-rule-card';
import { MemberIncomeInputCard } from '../../features/monthly-budget/components/member-income-input-card';
import { BudgetRunRow } from '../../features/monthly-budget/components/budget-run-row';

type AccountLike = BudgetAccountLike;
type MemberLike = BudgetMemberLike;

const SECTION_SORT_ORDER: Record<string, number> = {
  savings: 0,
  investments: 1,
  pots: 2,
  ppr: 3,
  remaining_cash: 4,
};

type MemberContributionSummary = {
  label: string;
  section: MonthlyBudgetRuleDraft['section'];
  amount: number;
};

const SHARED_SUMMARY_ID = '__shared__';

function monthKey(value: string) {
  return value.slice(0, 7);
}

function pickDefaultAccountId(accounts: AccountLike[], ownerId: string | null, allowedTypes: string[]) {
  const owned = accounts.find((account) => account.owner_profile_id === ownerId && allowedTypes.includes(account.type));
  if (owned) return owned.id;

  const shared = accounts.find((account) => account.owner_profile_id === null && allowedTypes.includes(account.type));
  if (shared) return shared.id;

  const any = accounts.find((account) => allowedTypes.includes(account.type));
  return any?.id ?? '';
}

function buildPotNameByAccountId(
  assignments: { pot_id: string; account_id: string }[],
  potNameMap: Map<string, string>,
) {
  return assignments.reduce<Record<string, string>>((result, assignment) => {
    const potName = potNameMap.get(assignment.pot_id);
    if (potName) result[assignment.account_id] = potName;
    return result;
  }, {});
}

function getSectionRank(section: string) {
  return SECTION_SORT_ORDER[section] ?? 99;
}

function normalizeMonthSelection(months: unknown) {
  if (!Array.isArray(months)) return [];

  return [...new Set(
    months
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item >= 1 && item <= 12),
  )].sort((a, b) => a - b);
}

function getRuleRowKey(index: number, totalRules: number, columns: number) {
  const rowStart = columns === 1 ? index : Math.floor(index / columns) * columns;
  const rowRuleCount = columns === 1 ? 1 : Math.min(columns, totalRules - rowStart);
  const rowEnd = rowStart + rowRuleCount - 1;
  return `${rowStart}-${rowEnd}`;
}

function getTransferKey(transfer: { ruleId?: string | null; title: string; destinationAccountId: string }) {
  return `${transfer.ruleId ?? transfer.title}-${transfer.destinationAccountId}`;
}

function isRuleDraftValid(rule: MonthlyBudgetRuleDraft) {
  const amount = Number(rule.amount);
  const activeMonths = normalizeMonthSelection(rule.activeMonths);
  const activeFromMonth = rule.activeFromMonth ? Number(rule.activeFromMonth) : null;
  const activeToMonth = rule.activeToMonth ? Number(rule.activeToMonth) : null;
  const hasActiveRange = Boolean(rule.activeFromMonth || rule.activeToMonth);
  const hasValidActiveFromMonth = activeFromMonth != null && Number.isFinite(activeFromMonth) && activeFromMonth >= 1 && activeFromMonth <= 12;
  const hasValidActiveToMonth = activeToMonth != null && Number.isFinite(activeToMonth) && activeToMonth >= 1 && activeToMonth <= 12;
  return Boolean(
    rule.name.trim() &&
      rule.sourceAccountId &&
      rule.destinationAccountId &&
      Number.isFinite(amount) &&
      amount > 0 &&
      activeMonths.length === rule.activeMonths.length &&
      (!rule.activeFromMonth || hasValidActiveFromMonth) &&
      (!rule.activeToMonth || hasValidActiveToMonth) &&
      (!hasActiveRange || (rule.activeFromMonth && rule.activeToMonth)),
  );
}

function sortRuleDrafts(rules: MonthlyBudgetRuleDraft[]) {
  return [...rules].sort((a, b) => {
    const sectionDelta = getSectionRank(a.section) - getSectionRank(b.section);
    if (sectionDelta !== 0) return sectionDelta;

    const priorityDelta = Number(a.priority) - Number(b.priority);
    if (Number.isFinite(priorityDelta) && priorityDelta !== 0) return priorityDelta;

    return a.name.localeCompare(b.name);
  });
}

function createDefaultIncomeDrafts(
  members: MemberLike[],
  accounts: AccountLike[],
  incomeMode: 'shared' | 'individual',
  budgetMonth: string,
) {
  const sharedCashAccount = pickDefaultAccountId(accounts, null, ['cash', 'bank']);

  return members.map((member) => ({
    memberId: member.userId,
    cashAccountId:
      incomeMode === 'shared'
        ? sharedCashAccount
        : pickDefaultAccountId(accounts, member.userId, ['cash', 'bank']) || sharedCashAccount,
      amount: '',
      availableMonth: monthKey(budgetMonth),
    }));
}

function mapRulesToDrafts(rules: any[]): MonthlyBudgetRuleDraft[] {
  return rules.map((rule, index) => ({
    id: rule.id ?? `${rule.name ?? 'rule'}-${index}`,
    name: rule.name ?? '',
    section: rule.section ?? 'savings',
    sourceAccountId: rule.source_account_id ?? '',
    destinationAccountId: rule.destination_account_id ?? '',
    destinationPotId: null,
    destinationKind: 'account',
    ownerMemberId: rule.owner_member_id ?? null,
    amount: String(rule.amount ?? ''),
    priority: String(rule.priority ?? index),
    isActive: Boolean(rule.is_active ?? true),
    activeMonths: normalizeMonthSelection(rule.active_months),
    activeFromMonth: rule.active_from_month ? String(rule.active_from_month) : '',
    activeToMonth: rule.active_to_month ? String(rule.active_to_month) : '',
  }));
}

function mapIncomeInputsToDrafts(inputs: any[], members: MemberLike[], accounts: AccountLike[]): MonthlyBudgetIncomeDraft[] {
  return members.map((member) => {
    const match = inputs.find((item) => item.member_id === member.userId || item.memberId === member.userId);
    return {
      memberId: member.userId,
      cashAccountId: match?.cash_account_id ?? match?.cashAccountId ?? pickDefaultAccountId(accounts, member.userId, ['cash', 'bank']),
      amount: match ? String(match.amount ?? '') : '',
      availableMonth: monthKey(String(match?.available_month ?? match?.availableMonth ?? '')),
    };
  });
}

// A thin, animated fill bar used for the hero allocation meter and the
// rules section's configured-total meter — width eases in with a spring-like
// timing curve instead of snapping instantly whenever the underlying numbers
// change, which reads as a much more considered, "alive" surface.
function AnimatedProgressBar({
  percent,
  color,
  trackColor,
  height = spacing(2.5),
}: {
  percent: number;
  color: string;
  trackColor: string;
  height?: number;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(100, percent)), { duration: 550 });
  }, [percent, width]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={{ height, borderRadius: radius.full, overflow: 'hidden', backgroundColor: trackColor } as any}>
      <Animated.View style={[{ height: '100%', borderRadius: radius.full, backgroundColor: color }, animatedStyle]} />
    </View>
  );
}

// The per-person contribution row in the hero card: press-and-hold gives a
// subtle scale-down (a cheap way to make an otherwise flat list item feel
// tappable), and the contribution list fades/slides in on expand instead of
// popping into place.
function PersonSummaryRow({
  row,
  accentColor,
  isCollapsed,
  onToggle,
}: {
  row: { id: string; label: string; value: string; contributions: MemberContributionSummary[] };
  accentColor: string;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  const hasContributions = row.contributions.length > 0;
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View
      style={{
        gap: spacing(2),
        paddingVertical: spacing(2),
        paddingHorizontal: spacing(3),
        borderRadius: radius.lg,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: spacing(1),
        borderLeftColor: accentColor,
      } as any}
    >
      <Animated.View style={pressStyle}>
        <Pressable
          onPress={() => hasContributions && onToggle()}
          onPressIn={() => {
            if (hasContributions) scale.value = withSpring(0.98, { damping: 16, stiffness: 320 });
          }}
          onPressOut={() => {
            if (hasContributions) scale.value = withSpring(1, { damping: 16, stiffness: 320 });
          }}
          accessibilityRole={hasContributions ? 'button' : undefined}
          accessibilityState={hasContributions ? { expanded: !isCollapsed } : undefined}
          accessibilityLabel={row.label}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing(3) } as any}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name="person-circle-outline" size={16} color={accentColor} />
            <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.semibold) } as any}>{row.label}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Text style={{ color: accentColor, fontWeight: String(typography.fontWeight.bold) } as any}>{row.value}</Text>
            {hasContributions ? (
              <Ionicons name={isCollapsed ? 'chevron-forward-outline' : 'chevron-down-outline'} size={16} color={colors.textSecondary} />
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
      {hasContributions && !isCollapsed ? (
        <Animated.View entering={FadeInDown.duration(220)} style={{ gap: spacing(1) } as any}>
          {row.contributions.map((contribution, contributionIndex) => (
            <View
              key={`${row.id}-${contribution.section}-${contribution.label}-${contributionIndex}`}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing(2) } as any}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) } as any}>
                <Ionicons name={getSectionBadgeIcon(contribution.section)} size={12} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
                  {contribution.label}
                </Text>
              </View>
              <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>
                {formatCurrency(contribution.amount)}
              </Text>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

export default function BudgetScreen() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const { householdId, profile } = useAuth();
  const { width: windowWidth } = useWindowDimensions();

  const householdsQuery = useMyHouseholds();
  const workspaceQuery = useMonthlyBudgetWorkspace();
  const runsQuery = useMonthlyBudgetRuns();
  const accountsQuery = useAccounts();
  const accountBalancesQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const recurringQuery = useRecurringTransactions();
  const savingPotsQuery = useSavingPots();
  const savingPotAssignmentsQuery = useSavingPotAccountAssignments();
  const saveConfiguration = useSaveMonthlyBudgetConfiguration();
  const saveDraft = useSaveMonthlyBudgetDraft();
  const cancelRun = useCancelMonthlyBudgetRun();
  const confirmRun = useConfirmMonthlyBudgetRun();
  const deleteRunTransactions = useDeleteMonthlyBudgetRunTransactions();

  const households = householdsQuery.data ?? [];
  const household = households.find((item: any) => item.id === householdId) ?? null;
  const workspace = workspaceQuery.data ?? null;
  const runs = runsQuery.data ?? [];
  const accounts = useMemo<AccountLike[]>(() => {
    const balancesById = new Map(
      (accountBalancesQuery.data ?? []).map((account) => [account.id, Number(account.current_balance ?? 0)]),
    );

    return (accountsQuery.data ?? []).map((account) => ({
      ...account,
      current_balance: balancesById.get(account.id) ?? 0,
    }));
  }, [accountBalancesQuery.data, accountsQuery.data]);
  const members = ((membersQuery.data ?? []) as MemberLike[]).filter((member) => member.status === 'accepted');
  const recurringTransactions = recurringQuery.data ?? [];
  const savingPots = savingPotsQuery.data ?? [];
  const savingPotAssignments = savingPotAssignmentsQuery.data ?? [];

  const [configId, setConfigId] = useState<string | null>(null);
  const [budgetName, setBudgetName] = useState('');
  const [incomeMode, setIncomeMode] = useState<'shared' | 'individual'>('shared');
  const [remainingCashStrategy, setRemainingCashStrategy] = useState<'keep' | 'fixed'>('keep');
  const [fixedRemainingCashAmount, setFixedRemainingCashAmount] = useState('0');
  const [excessCashDistributionMethod, setExcessCashDistributionMethod] = useState<'even_split'>('even_split');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [deleteRunFeedback, setDeleteRunFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [ruleDrafts, setRuleDrafts] = useState<MonthlyBudgetRuleDraft[]>([]);
  const [incomeDrafts, setIncomeDrafts] = useState<MonthlyBudgetIncomeDraft[]>([]);
  const [collapsedRuleRowKeys, setCollapsedRuleRowKeys] = useState<string[]>([]);
  const [hasLoadedCollapsedPreference, setHasLoadedCollapsedPreference] = useState(false);
  // Per-row collapse for the per-person contribution breakdown (Monthly
  // income inputs, Transfers, and Monthly runs use Section's built-in
  // `collapsible` prop instead — this one is a list of rows within a
  // single Section, not a Section of its own).
  const [collapsedPersonSummaryIds, setCollapsedPersonSummaryIds] = useState<string[]>([]);
  // Tracks which of this month's preview transfers the user has already
  // carried out manually (rules only generate a plan — nothing here moves
  // money automatically), so re-opening the budget later still shows what's
  // left to do. Keyed per household+month since the transfer list itself is
  // computed fresh from that month's rules/income each time.
  const [doneTransferKeys, setDoneTransferKeys] = useState<string[]>([]);

  const hydratedConfigId = useRef<string | null>(null);
  const hydratedWorkspaceSignature = useRef<string | null>(null);
  const hydratedRunId = useRef<string | null>(null);
  const hydratedIncomeMonth = useRef<string | null>(null);
  const hydratedCollapsedPreferenceKey = useRef<string | null>(null);
  const collapsedPreferenceDirtyRef = useRef(false);
  const collapsedStateKey = householdId ? `smartfinance:monthly-budget:collapsed-rows:${householdId}` : null;
  const hydratedDoneTransfersKey = useRef<string | null>(null);
  const doneTransfersStateKey = householdId ? `smartfinance:monthly-budget:done-transfers:${householdId}:${monthKey(month)}` : null;

  const currentMonthRun = useMemo(
    () => runs.find((run: any) => monthKey(run.month) === month) ?? null,
    [month, runs],
  );
  const selectedRun = useMemo(
    () => runs.find((run: any) => run.id === selectedRunId) ?? currentMonthRun,
    [currentMonthRun, runs, selectedRunId],
  );
  const runIncomeInputsQuery = useMonthlyBudgetIncomeInputs(selectedRun?.id ?? null);
  const incomeCashAccountIds = useMemo(
    () => [...new Set(incomeDrafts.map((item) => item.cashAccountId).filter(Boolean))],
    [incomeDrafts],
  );
  const incomeCashAccounts = useMemo(
    () => accounts.filter((account) => incomeCashAccountIds.includes(account.id)),
    [accounts, incomeCashAccountIds],
  );
  const destinationAccountTypeLabels = useMemo(
    () => ({
      bank: t('budget.destinationGroups.bank'),
      cash: t('budget.destinationGroups.cash'),
      savings: t('budget.destinationGroups.savings'),
      credit_card: t('budget.destinationGroups.credit_card'),
      investment: t('budget.destinationGroups.investment'),
      ppr: t('budget.destinationGroups.ppr'),
    }),
    [t],
  );
  const accountNameMap = useMemo(() => new Map(accounts.map((account) => [account.id, account.name])), [accounts]);
  const potNameMap = useMemo(() => new Map(savingPots.map((pot: any) => [pot.id, pot.name])), [savingPots]);
  const potNameByAccountId = useMemo(
    () => buildPotNameByAccountId(savingPotAssignments, potNameMap),
    [potNameMap, savingPotAssignments],
  );
  const ruleColumns = windowWidth >= 980 ? 2 : 1;
  const workspaceSignature = useMemo(
    () =>
      workspace?.config?.id
        ? JSON.stringify({
          configId: workspace.config.id,
          configName: workspace.config.name ?? '',
          householdSettings: household
            ? {
                id: household.id,
                updatedAt: household.updated_at ?? '',
                incomeMode: household.income_mode ?? 'shared',
                remainingCashStrategy: household.remaining_cash_strategy ?? 'keep',
                fixedRemainingCashAmount: household.fixed_remaining_cash_amount ?? 0,
                excessCashDistributionMethod: household.excess_cash_distribution_method ?? 'even_split',
              }
            : null,
          rules: (workspace.rules ?? []).map((rule: any) => ({
              id: rule.id,
              updatedAt: rule.updated_at ?? '',
              priority: rule.priority ?? null,
              amount: rule.amount ?? null,
              sourceAccountId: rule.source_account_id ?? '',
              destinationAccountId: rule.destination_account_id ?? '',
              isActive: rule.is_active ?? true,
              activeMonths: normalizeMonthSelection(rule.active_months),
              activeFromMonth: rule.active_from_month ?? null,
              activeToMonth: rule.active_to_month ?? null,
            })),
          })
        : null,
    [household, workspace?.config?.id, workspace?.config?.name, workspace?.rules],
  );

  useEffect(() => {
    if (workspace?.config?.id && workspaceSignature && hydratedWorkspaceSignature.current !== workspaceSignature) {
      hydratedConfigId.current = workspace.config.id;
      hydratedWorkspaceSignature.current = workspaceSignature;
      setConfigId(workspace.config.id);
      setBudgetName(workspace.config.name ?? t('budget.defaultName'));
      setRuleDrafts(sortRuleDrafts(mapRulesToDrafts(workspace.rules ?? [])));
      setIncomeMode((household?.income_mode ?? 'shared') as 'shared' | 'individual');
      setRemainingCashStrategy((household?.remaining_cash_strategy ?? 'keep') as 'keep' | 'fixed');
      setFixedRemainingCashAmount(String(household?.fixed_remaining_cash_amount ?? 0));
      setExcessCashDistributionMethod((household?.excess_cash_distribution_method ?? 'even_split') as 'even_split');
      return;
    }

    if (!workspace?.config?.id && hydratedConfigId.current !== '__draft__' && accounts.length > 0 && members.length > 0) {
      hydratedConfigId.current = '__draft__';
      hydratedWorkspaceSignature.current = '__draft__';
      setConfigId(null);
      setBudgetName(t('budget.defaultName'));
      setRuleDrafts([]);
      setIncomeMode((household?.income_mode ?? 'shared') as 'shared' | 'individual');
      setRemainingCashStrategy((household?.remaining_cash_strategy ?? 'keep') as 'keep' | 'fixed');
      setFixedRemainingCashAmount(String(household?.fixed_remaining_cash_amount ?? 0));
      setExcessCashDistributionMethod((household?.excess_cash_distribution_method ?? 'even_split') as 'even_split');
    }
  }, [accounts, household, members, t, workspace?.config?.id, workspace?.config?.name, workspace?.rules, workspaceSignature]);

  useEffect(() => {
    if (!selectedRun?.id || hydratedRunId.current === selectedRun.id) return;

    if (runIncomeInputsQuery.data) {
      hydratedRunId.current = selectedRun.id;
      hydratedIncomeMonth.current = monthKey(selectedRun.month);
      setIncomeDrafts(mapIncomeInputsToDrafts(runIncomeInputsQuery.data as any[], members, accounts));
      if (selectedRun.month) setMonth(monthKey(selectedRun.month));
      return;
    }

    if (members.length > 0 && accounts.length > 0 && !runIncomeInputsQuery.isFetching) {
      hydratedRunId.current = selectedRun.id;
      hydratedIncomeMonth.current = monthKey(selectedRun.month);
      setIncomeDrafts(createDefaultIncomeDrafts(members, accounts, incomeMode, selectedRun.month));
      if (selectedRun.month) setMonth(monthKey(selectedRun.month));
    }
  }, [accounts, householdId, incomeMode, members, runIncomeInputsQuery.data, runIncomeInputsQuery.isFetching, selectedRun?.id, selectedRun?.month]);

  useEffect(() => {
    if (selectedRun?.id) return;
    if (members.length > 0 && accounts.length > 0 && hydratedIncomeMonth.current !== month) {
      hydratedIncomeMonth.current = month;
      setIncomeDrafts(createDefaultIncomeDrafts(members, accounts, incomeMode, month));
    }
  }, [accounts, householdId, incomeMode, members, month, selectedRun?.id]);

  useEffect(() => {
    if (incomeCashAccountIds.length === 0) return;

    setRuleDrafts((current) =>
      current.map((rule) =>
        incomeCashAccountIds.includes(rule.sourceAccountId)
          ? rule
          : { ...rule, sourceAccountId: incomeCashAccountIds[0] },
      ),
    );
  }, [incomeCashAccountIds]);

  useEffect(() => {
    if (!collapsedStateKey || ruleDrafts.length === 0) return;
    if (hydratedCollapsedPreferenceKey.current === collapsedStateKey) return;

    const raw = getPersistentString(collapsedStateKey);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCollapsedRuleRowKeys(parsed.filter((item) => typeof item === 'string'));
        }
      } catch {
        setCollapsedRuleRowKeys([]);
      }
      collapsedPreferenceDirtyRef.current = false;
    } else {
      setCollapsedRuleRowKeys([]);
      collapsedPreferenceDirtyRef.current = false;
    }

    setHasLoadedCollapsedPreference(true);
    hydratedCollapsedPreferenceKey.current = collapsedStateKey;
  }, [collapsedStateKey, ruleDrafts.length]);

  useEffect(() => {
    if (!collapsedStateKey || !hasLoadedCollapsedPreference) return;
    if (!collapsedPreferenceDirtyRef.current && getPersistentString(collapsedStateKey) === null) return;
    setPersistentString(collapsedStateKey, JSON.stringify(collapsedRuleRowKeys));
  }, [collapsedRuleRowKeys, collapsedStateKey, hasLoadedCollapsedPreference]);

  useEffect(() => {
    if (!doneTransfersStateKey) return;
    if (hydratedDoneTransfersKey.current === doneTransfersStateKey) return;

    const raw = getPersistentString(doneTransfersStateKey);
    hydratedDoneTransfersKey.current = doneTransfersStateKey;

    if (!raw) {
      setDoneTransferKeys([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setDoneTransferKeys(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []);
    } catch {
      setDoneTransferKeys([]);
    }
  }, [doneTransfersStateKey]);

  useEffect(() => {
    if (!doneTransfersStateKey || hydratedDoneTransfersKey.current !== doneTransfersStateKey) return;
    setPersistentString(doneTransfersStateKey, JSON.stringify(doneTransferKeys));
  }, [doneTransferKeys, doneTransfersStateKey]);

  const preview = useMemo<MonthlyBudgetPreview>(() => {
    const mappedRules = ruleDrafts.map((rule, index) => ({
      id: rule.id,
      budget_config_id: configId ?? 'draft',
      name: rule.name,
      section: rule.section,
      source_account_id: rule.sourceAccountId,
      destination_account_id: rule.destinationAccountId,
      destination_pot_id: null,
      owner_member_id: rule.ownerMemberId || null,
      amount: Number(rule.amount),
      frequency: 'monthly',
      priority: Number.isFinite(Number(rule.priority)) ? Number(rule.priority) : index,
      is_active: rule.isActive,
      active_months: normalizeMonthSelection(rule.activeMonths),
      active_from_month: rule.activeFromMonth ? Number(rule.activeFromMonth) : null,
      active_to_month: rule.activeToMonth ? Number(rule.activeToMonth) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    return monthlyBudgetService.buildPreview({
      settings: household
        ? {
            income_mode: incomeMode,
            remaining_cash_strategy: remainingCashStrategy,
            fixed_remaining_cash_amount: Number(fixedRemainingCashAmount || 0),
            excess_cash_distribution_method: excessCashDistributionMethod,
          }
        : null,
      rules: mappedRules as any,
      members,
      accounts: accounts as any,
      savingPots: savingPots as any,
      savingPotAccountAssignments: savingPotAssignments as any,
      incomeInputs: incomeDrafts,
      recurringTransactions: recurringTransactions as any,
      month,
    });
  }, [
    accounts,
    budgetName,
    configId,
    excessCashDistributionMethod,
    fixedRemainingCashAmount,
    household,
    incomeDrafts,
    incomeMode,
    members,
    month,
    remainingCashStrategy,
    recurringTransactions,
    savingPots,
    savingPotAssignments,
    ruleDrafts,
  ]);

  const rulesAreValid = ruleDrafts.every(isRuleDraftValid);
  const invalidRuleCount = ruleDrafts.filter((rule) => !isRuleDraftValid(rule)).length;

  const autoCollapsedRuleRowKeys = !hasLoadedCollapsedPreference && windowWidth < 860
    ? ruleDrafts.map((_, index) => getRuleRowKey(index, ruleDrafts.length, ruleColumns))
    : [];
  const effectiveCollapsedRuleRowKeys = hasLoadedCollapsedPreference
    ? collapsedRuleRowKeys
    : autoCollapsedRuleRowKeys;
  const allRuleRowKeys = useMemo(() => {
    const keys: string[] = [];
    for (let index = 0; index < ruleDrafts.length; index += ruleColumns) {
      keys.push(getRuleRowKey(index, ruleDrafts.length, ruleColumns));
    }
    return keys;
  }, [ruleColumns, ruleDrafts.length]);
  const allRulesCollapsed = ruleDrafts.length > 0 && allRuleRowKeys.every((key) => effectiveCollapsedRuleRowKeys.includes(key));
  const configReady = Boolean(householdId && profile?.id && budgetName.trim() && rulesAreValid);
  const draftReady = Boolean(configId && configReady && preview.validationIssues.length === 0);
  const confirmReady = Boolean(draftReady && currentMonthRun?.status !== 'confirmed');

  // Tells the user why the action buttons above are disabled, since a
  // greyed-out button with no explanation is easy to get stuck on. Checked
  // in the same order the buttons unlock: name -> valid rules -> saved
  // config -> clean preview -> not already confirmed.
  const actionHint = !budgetName.trim()
    ? t('budget.hintNeedsName')
    : invalidRuleCount > 0
      ? t('budget.hintFixRules', { count: invalidRuleCount })
      : !configId
        ? t('budget.hintSaveConfigFirst')
        : preview.validationIssues.length > 0
          ? t('budget.hintResolveIssues', { count: preview.validationIssues.length })
          : currentMonthRun?.status === 'confirmed'
            ? t('budget.hintMonthConfirmed')
            : null;

  function updateRuleDraft(id: string, patch: Partial<MonthlyBudgetRuleDraft>) {
    setRuleDrafts((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }

  function addRule() {
    setRuleDrafts((current) => [
      ...current,
      {
        id: `rule-${Date.now()}`,
        name: '',
        section: 'savings',
        sourceAccountId: pickDefaultAccountId(accounts, null, ['cash', 'bank']),
        destinationAccountId: pickDefaultAccountId(accounts, null, ['savings', 'investment', 'ppr', 'cash', 'bank']),
        destinationPotId: null,
        destinationKind: 'account',
        ownerMemberId: members[0]?.userId ?? null,
        amount: '0',
        priority: String(current.length),
        isActive: true,
        activeMonths: [],
        activeFromMonth: '',
        activeToMonth: '',
      },
    ]);
  }

  function removeRule(id: string) {
    setRuleDrafts((current) => current.filter((rule) => rule.id !== id));
  }

  function updateIncomeDraft(memberId: string, patch: Partial<MonthlyBudgetIncomeDraft>) {
    setIncomeDrafts((current) => current.map((item) => (item.memberId === memberId ? { ...item, ...patch } : item)));
  }

  function setCollapsedPreference(next: string[]) {
    collapsedPreferenceDirtyRef.current = true;
    setCollapsedRuleRowKeys(next);
  }

  function updateDestinationDraft(ruleId: string, selection: DestinationSelection) {
    setRuleDrafts((current) =>
      current.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              destinationKind: 'account',
              destinationPotId: null,
              destinationAccountId: selection.id,
            }
          : rule,
      ),
    );
  }

  function updateRuleActiveMonths(ruleId: string, monthValue: number) {
    setRuleDrafts((current) =>
      current.map((rule) => {
        if (rule.id !== ruleId) return rule;

        const activeMonths = rule.activeMonths.includes(monthValue)
          ? rule.activeMonths.filter((item) => item !== monthValue)
          : [...rule.activeMonths, monthValue].sort((a, b) => a - b);

        return { ...rule, activeMonths };
      }),
    );
  }

  function toggleRuleCollapsed(id: string) {
    collapsedPreferenceDirtyRef.current = true;
    setCollapsedRuleRowKeys((current) => {
      const targetIndex = ruleDrafts.findIndex((rule) => rule.id === id);
      if (targetIndex < 0) return current;

      const rowStart = ruleColumns === 1 ? targetIndex : Math.floor(targetIndex / ruleColumns) * ruleColumns;
      const rowRuleCount = ruleColumns === 1 ? 1 : Math.min(ruleColumns, ruleDrafts.length - rowStart);
      const rowEnd = rowStart + rowRuleCount - 1;
      const rowKey = `${rowStart}-${rowEnd}`;
      const rowIsFullyCollapsed = current.includes(rowKey);
      const shouldCollapse = !rowIsFullyCollapsed;

      if (shouldCollapse) {
        return [...new Set([...current, rowKey])];
      }

      return current.filter((item) => item !== rowKey);
    });
  }

  function togglePersonSummaryCollapsed(id: string) {
    setCollapsedPersonSummaryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleTransferDone(key: string) {
    setDoneTransferKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  async function handleSaveConfiguration() {
    if (!householdId || !budgetName.trim()) return;

    const orderedRules = sortRuleDrafts(ruleDrafts);
    const result = await saveConfiguration.mutateAsync({
      householdId,
      configId,
      name: budgetName.trim(),
      incomeMode,
      remainingCashStrategy,
      fixedRemainingCashAmount: Number(fixedRemainingCashAmount || 0),
      excessCashDistributionMethod,
      rules: orderedRules,
    });

    setConfigId(result.config.id);
    hydratedConfigId.current = result.config.id;
    setRuleDrafts(sortRuleDrafts(ruleDrafts));
    setCollapsedRuleRowKeys([]);
    collapsedPreferenceDirtyRef.current = false;
  }

  async function handleSaveDraft() {
    if (!householdId || !configId) return;

    const result = await saveDraft.mutateAsync({
      householdId,
      configId,
      month,
      incomeModeSnapshot: incomeMode,
      remainingCashStrategySnapshot: remainingCashStrategy,
      previewSnapshot: preview,
      incomeInputs: incomeDrafts,
    });

    setSelectedRunId(result.run.id);
    hydratedRunId.current = result.run.id;
  }

  async function handleConfirmRun() {
    if (!householdId || !profile?.id || !configId) return;

    // Always persist the values currently shown in the preview before confirming.
    // This makes confirmation a single action and avoids running a stale draft.
    const result = await saveDraft.mutateAsync({
      householdId,
      configId,
      month,
      incomeModeSnapshot: incomeMode,
      remainingCashStrategySnapshot: remainingCashStrategy,
      previewSnapshot: preview,
      incomeInputs: incomeDrafts,
    });

    setSelectedRunId(result.run.id);
    hydratedRunId.current = result.run.id;

    await confirmRun.mutateAsync({
      runId: result.run.id,
      preview,
    });
  }

  async function executeDeleteRunTransactions(runId: string) {
    setDeleteRunFeedback(null);

    try {
      const deletedCount = await deleteRunTransactions.mutateAsync(runId);
      setDeleteRunFeedback({
        type: 'success',
        message: t('budget.deleteRunTransactionsSuccess', { count: deletedCount }),
      });
    } catch (error: any) {
      const detail = error?.message ?? String(error);
      setDeleteRunFeedback({
        type: 'error',
        message: t('budget.deleteRunTransactionsError', { detail }),
      });
    }
  }

  function handleDeleteRunTransactions() {
    if (!selectedRun?.id) return;

    const runId = selectedRun.id;
    const message = t('budget.deleteRunTransactionsMessage');

    if (Platform.OS === 'web') {
      if (globalThis.confirm(`${t('budget.deleteRunTransactionsTitle')}\n\n${message}`)) {
        void executeDeleteRunTransactions(runId);
      }
      return;
    }

    Alert.alert(
      t('budget.deleteRunTransactionsTitle'),
      message,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('budget.deleteRunTransactionsConfirm'),
          style: 'destructive',
          onPress: () => void executeDeleteRunTransactions(runId),
        },
      ],
    );
  }

  function handleSelectRun(run: any) {
    setSelectedRunId(run.id);
    setMonth(monthKey(run.month));
    hydratedRunId.current = null;
  }

  const runInputs = runIncomeInputsQuery.data ?? [];
  const ruleCardStyle = useMemo(() => {
    if (ruleColumns === 1) {
      return { width: '100%' };
    }

    return {
      flexBasis: '48%',
      flexGrow: 0,
      flexShrink: 1,
      minWidth: 420,
    };
  }, [ruleColumns]);
  const budgetIsOnTrack = preview.configuredTotal <= preview.incomeTotal;
  const budgetStatusLabel = budgetIsOnTrack ? t('budget.onTrack') : t('budget.overBudget');
  const budgetStatusColor = budgetIsOnTrack ? colors.success : colors.destructive;
  const allocationPercent = Math.min(
    100,
    preview.incomeTotal > 0 ? Math.round((preview.configuredTotal / preview.incomeTotal) * 100) : 0,
  );
  const incomeModeSummary = t('budget.incomeModeSummary', {
    value: t(`budget.incomeModes.${incomeMode}`),
  });
  const memberContributionMap = useMemo(() => {
    const rulesById = new Map(ruleDrafts.map((rule) => [rule.id, rule]));
    const accountsById = new Map(accounts.map((account) => [account.id, account]));
    const grouped = new Map<string, MemberContributionSummary[]>();

    for (const transfer of preview.transfers) {
      if (transfer.isSystemGenerated || !transfer.ruleId) continue;

      const rule = rulesById.get(transfer.ruleId);
      const sourceAccount = accountsById.get(transfer.sourceAccountId);
      const memberId = rule?.ownerMemberId || sourceAccount?.owner_profile_id || SHARED_SUMMARY_ID;

      const current = grouped.get(memberId) ?? [];
      current.push({
        label: transfer.title,
        section: transfer.section,
        amount: transfer.amount,
      });
      grouped.set(memberId, current);
    }

    for (const [memberId, contributions] of grouped.entries()) {
      grouped.set(
        memberId,
        contributions.sort((a, b) => {
          const sectionDelta = getSectionRank(a.section) - getSectionRank(b.section);
          if (sectionDelta !== 0) return sectionDelta;
          return a.label.localeCompare(b.label);
        }),
      );
    }

    return grouped;
  }, [accounts, preview.transfers, ruleDrafts]);
  const memberSummaryRows = useMemo(() => {
    const people = members
        .map((member) => ({
          id: member.userId,
          label: getMemberLabel(member),
          value: formatCurrency(preview.memberTotals[member.userId] ?? 0),
          contributions: memberContributionMap.get(member.userId) ?? [],
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

    const sharedContributions = memberContributionMap.get(SHARED_SUMMARY_ID) ?? [];
    if (sharedContributions.length === 0) return people;

    return [
      ...people,
      {
        id: SHARED_SUMMARY_ID,
        label: t('budget.shared'),
        value: formatCurrency(sharedContributions.reduce((total, item) => total + item.amount, 0)),
        contributions: sharedContributions,
      },
    ];
  }, [memberContributionMap, members, preview.memberTotals, t]);
  const resumeRows = useMemo(
    () => [
      { label: t('budget.incomeTotal'), value: formatCurrency(preview.incomeTotal), icon: 'cash-outline' as const },
      { label: t('budget.recurringNet'), value: formatCurrency(preview.recurringNetTotal), icon: 'repeat-outline' as const },
      { label: t('budget.budgetStatus'), value: budgetStatusLabel, icon: 'pulse-outline' as const },
    ],
    [budgetStatusLabel, preview.incomeTotal, preview.recurringNetTotal, t],
  );
  const previewStats = useMemo(
    () => [
      { label: t('budget.incomeTotal'), value: formatCurrency(preview.incomeTotal), icon: 'cash-outline' as const },
      { label: t('budget.configuredTotal'), value: formatCurrency(preview.configuredTotal), icon: 'layers-outline' as const },
      { label: t('budget.remainingCash'), value: formatCurrency(preview.remainingCash), icon: 'wallet-outline' as const },
      { label: t('budget.recurringNet'), value: formatCurrency(preview.recurringNetTotal), icon: 'repeat-outline' as const },
    ],
    [preview.configuredTotal, preview.incomeTotal, preview.recurringNetTotal, preview.remainingCash, t],
  );

  return (
    <Page
      title={t('budget.title')}
      subtitle={t('budget.subtitle')}
      overlay={
        // A persistent bottom bar instead of header-only actions: this is a
        // long, multi-section page, and the save/confirm buttons used to
        // scroll out of view as soon as you moved past the header. Mirrors
        // the floating-action-button pattern used on the Transactions screen.
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: spacing(4),
            paddingTop: spacing(2.5),
            paddingBottom: spacing(3),
            gap: spacing(2),
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          } as any}
        >
          {actionHint ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
              <Text style={{ flex: 1, color: colors.textSecondary, fontSize: typography.fontSize[12] } as any} numberOfLines={2}>
                {actionHint}
              </Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
            <View style={{ flex: 1, minWidth: 160 } as any}>
              <Button label={saveConfiguration.isPending ? t('saving') : t('budget.saveConfiguration')} onPress={() => void handleSaveConfiguration()} disabled={!configReady || saveConfiguration.isPending} />
            </View>
            <View style={{ flex: 1, minWidth: 160 } as any}>
              <Button label={saveDraft.isPending ? t('saving') : t('budget.saveDraft')} onPress={() => void handleSaveDraft()} variant="secondary" disabled={!draftReady || saveDraft.isPending} />
            </View>
            <View style={{ flex: 1, minWidth: 160 } as any}>
              <Button label={confirmRun.isPending || saveDraft.isPending ? t('budget.generating') : t('budget.confirmMonth')} onPress={() => void handleConfirmRun()} disabled={!confirmReady || confirmRun.isPending || saveDraft.isPending} />
            </View>
          </View>
        </View>
      }
    >
      <Animated.View entering={FadeInDown.delay(0).duration(420)}>
      <Card>
        <Section title={t('budget.resumeTitle')} subtitle={t('budget.resumeSubtitle')}>
          <View style={{ gap: spacing(2) } as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
              <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
                {incomeModeSummary}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
              <Ionicons name="layers-outline" size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.extraBold), textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10] } as any}>
                {t('budget.shared')}
              </Text>
            </View>
            <View style={{ borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' } as any}>
              <LinearGradient
                colors={[`${colors.primary}14`, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: spacing(30) } as any}
              />
              <View style={{ gap: spacing(3), padding: spacing(4.5), backgroundColor: colors.surfaceMuted } as any}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing(3) } as any}>
                  <View style={{ flex: 1, gap: spacing(1) } as any}>
                    <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: typography.letterSpacing[16], fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.extraBold) } as any}>
                      {t('budget.incomeTotal')}
                    </Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: typography.fontSize[48],
                        lineHeight: typography.lineHeight[52],
                        fontWeight: String(typography.fontWeight.black),
                        letterSpacing: -0.5,
                      } as any}
                    >
                      {formatCurrency(preview.incomeTotal)}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: spacing(2.5), paddingVertical: spacing(1.25), borderRadius: radius.full, backgroundColor: budgetIsOnTrack ? colors.successSoft : colors.destructiveSoft } as any}>
                    <Text style={{ color: budgetStatusColor, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.extraBold) } as any}>{budgetStatusLabel}</Text>
                  </View>
                </View>
                <AnimatedProgressBar percent={allocationPercent} color={budgetIsOnTrack ? colors.success : colors.destructive} trackColor={colors.muted} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                  <View style={{ flexGrow: 1, minWidth: 150, gap: spacing(0.5), padding: spacing(2.5), borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border } as any}>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.configuredTotal')}</Text>
                    <Text style={{ color: colors.primary, fontSize: typography.fontSize[18], fontWeight: String(typography.fontWeight.extraBold) } as any}>{formatCurrency(preview.configuredTotal)}</Text>
                  </View>
                  <View style={{ flexGrow: 1, minWidth: 150, gap: spacing(0.5), padding: spacing(2.5), borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border } as any}>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.remainingCash')}</Text>
                    <Text style={{ color: budgetIsOnTrack ? colors.success : colors.destructive, fontSize: typography.fontSize[18], fontWeight: String(typography.fontWeight.extraBold) } as any}>{formatCurrency(preview.remainingCash)}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={{ gap: spacing(1.5), padding: spacing(2.5), borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface } as any}>
              {resumeRows.slice(1).map((row) => (
                <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing(3) } as any}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                    <Ionicons name={row.icon} size={14} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{row.label}</Text>
                  </View>
                  <Text style={{ color: row.label === t('budget.budgetStatus') ? budgetStatusColor : colors.text, fontWeight: String(typography.fontWeight.extraBold) } as any}>{row.value}</Text>
                </View>
              ))}
            </View>
            <View style={{ gap: spacing(1.5), marginTop: spacing(1) } as any}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.extraBold), textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10] } as any}>
                  {t('budget.perPerson')}
                </Text>
              </View>
              <View style={{ gap: spacing(1) } as any}>
                {memberSummaryRows.map((row, index) => (
                  <PersonSummaryRow
                    key={row.id}
                    row={row}
                    accentColor={getMemberAccentColor(index, colors)}
                    isCollapsed={collapsedPersonSummaryIds.includes(row.id)}
                    onToggle={() => togglePersonSummaryCollapsed(row.id)}
                  />
                ))}
              </View>
            </View>
          </View>
        </Section>
      </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(420)}>
      <Card>
        <Section title={t('budget.householdSettings')} subtitle={t('budget.householdSettingsSubtitle')}>
          <Field label={t('budget.name')} value={budgetName} onChangeText={setBudgetName} placeholder={t('budget.namePlaceholder')} />
          <MonthPickerField label={t('budget.month')} value={month} onChange={setMonth} placeholder="MM-YYYY" />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.incomeMode')}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {(['shared', 'individual'] as const).map((item) => (
              <Pill key={item} label={t(`budget.incomeModes.${item}`)} active={incomeMode === item} onPress={() => setIncomeMode(item)} />
            ))}
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
            {t(`budget.incomeModeHints.${incomeMode}`)}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name="wallet-outline" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.remainingCashStrategy')}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {(['keep', 'fixed'] as const).map((item) => (
              <Pill key={item} label={t(`budget.remainingCashStrategies.${item}`)} active={remainingCashStrategy === item} onPress={() => setRemainingCashStrategy(item)} />
            ))}
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
            {t(`budget.remainingCashStrategyHints.${remainingCashStrategy}`)}
          </Text>

          {remainingCashStrategy === 'fixed' ? (
            <Field label={t('budget.fixedRemainingCashAmount')} value={fixedRemainingCashAmount} onChangeText={setFixedRemainingCashAmount} keyboardType="numeric" placeholder="0.00" />
          ) : null}
        </Section>
      </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(420)}>
      <Card>
        <Section title={t('budget.monthlyInputs')} subtitle={t('budget.monthlyInputsSubtitle')} collapsible>
          <View style={{ gap: spacing(3) }}>
            {members.map((member, index) => (
              <MemberIncomeInputCard
                key={member.userId}
                member={member}
                draft={incomeDrafts.find((item) => item.memberId === member.userId)}
                currentBudgetMonth={monthKey(month)}
                accounts={accounts}
                members={members}
                isLast={index === members.length - 1}
                onUpdateIncomeDraft={(patch) => updateIncomeDraft(member.userId, patch)}
              />
            ))}
          </View>
        </Section>
      </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(420)}>
      <Card>
        <Section
          title={t('budget.rulesTitle')}
          subtitle={t('budget.rulesSubtitle')}
          action={
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
              <Button
                label={allRulesCollapsed ? t('budget.expandAllRules') : t('budget.collapseAllRules')}
                onPress={() => setCollapsedPreference(allRulesCollapsed ? [] : allRuleRowKeys)}
                variant="secondary"
              />
              <Button label={t('budget.addRule')} onPress={addRule} variant="secondary" />
            </View>
          }
        >
          <View style={{ gap: spacing(2.5), marginBottom: spacing(2) } as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) } as any}>
              <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold } as any}>
                {t('budget.configuredTotal')}: {formatCurrency(preview.configuredTotal)}
              </Text>
              <Pill label={budgetStatusLabel} active />
            </View>
            <AnimatedProgressBar
              percent={preview.incomeTotal > 0 ? (preview.configuredTotal / preview.incomeTotal) * 100 : 0}
              color={colors.primary}
              trackColor={colors.surfaceMuted}
              height={spacing(2)}
            />
          </View>

          {ruleDrafts.length === 0 ? (
            <EmptyState
              title={t('budget.rulesEmptyTitle')}
              description={t('budget.rulesEmptyDescription')}
              icon="layers-outline"
              actionLabel={t('budget.addRule')}
              onAction={addRule}
            />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) } as any}>
              {ruleDrafts.map((rule, index) => {
                const rowStart = ruleColumns === 1 ? index : Math.floor(index / ruleColumns) * ruleColumns;
                const rowRuleCount = ruleColumns === 1 ? 1 : Math.min(ruleColumns, ruleDrafts.length - rowStart);
                const rowEnd = rowStart + rowRuleCount - 1;
                const rowKey = `${rowStart}-${rowEnd}`;
                const isCollapsed = effectiveCollapsedRuleRowKeys.includes(rowKey);

                return (
                  <BudgetRuleCard
                    key={rule.id}
                    rule={rule}
                    isCollapsed={isCollapsed}
                    isValid={isRuleDraftValid(rule)}
                    style={ruleCardStyle as any}
                    accounts={accounts}
                    members={members}
                    accountNameMap={accountNameMap}
                    destinationAccountTypeLabels={destinationAccountTypeLabels}
                    potNameByAccountId={potNameByAccountId}
                    incomeCashAccounts={incomeCashAccounts}
                    incomeCashAccountIds={incomeCashAccountIds}
                    onToggleCollapse={() => toggleRuleCollapsed(rule.id)}
                    onUpdateRule={(patch) => updateRuleDraft(rule.id, patch)}
                    onUpdateActiveMonths={(monthValue) => updateRuleActiveMonths(rule.id, monthValue)}
                    onUpdateDestination={(selection) => updateDestinationDraft(rule.id, selection)}
                    onRemoveRule={() => removeRule(rule.id)}
                  />
                );
              })}
            </View>
          )}
        </Section>
      </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(420)}>
      <Card>
        <Section title={t('budget.previewTitle')} subtitle={t('budget.previewSubtitle')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
            {previewStats.map((stat) => (
              <Card key={stat.label}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                  <Ionicons name={stat.icon} size={16} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] } as any}>{stat.label}</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: typography.fontSize[24], fontWeight: String(typography.fontWeight.extraBold) } as any}>{stat.value}</Text>
              </Card>
            ))}
          </View>

          <View style={{ gap: spacing(2.5) }}>
            {Object.entries(preview.sectionTotals).map(([section, amount]) => (
              <View key={section} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(3), padding: spacing(3), borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border } as any}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                  <Ionicons name={getSectionBadgeIcon(section as any)} size={16} color={colors.textSecondary} />
                  <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{t(`budget.sections.${section as any}`)}</Text>
                </View>
                <Text style={{ color: colors.primary, fontWeight: String(typography.fontWeight.extraBold) } as any}>{formatCurrency(amount)}</Text>
              </View>
            ))}
          </View>

          {preview.validationIssues.length > 0 ? (
            <View style={{ gap: spacing(2) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                <Ionicons name="warning-outline" size={16} color={colors.destructive} />
                <Text style={{ color: colors.destructive, fontWeight: String(typography.fontWeight.extraBold) } as any}>{t('budget.validationTitle')}</Text>
              </View>
              {preview.validationIssues.map((issue) => (
                <Text key={issue} style={{ color: colors.destructive }}>{issue}</Text>
              ))}
            </View>
          ) : null}

          {preview.transfers.length > 0 ? (
            <Section
              title={t('budget.transfersTitle')}
              subtitle={t('budget.transfersProgress', {
                done: preview.transfers.filter((transfer) => doneTransferKeys.includes(getTransferKey(transfer))).length,
                count: preview.transfers.length,
              })}
              collapsible
              defaultCollapsed={preview.transfers.length > 6}
            >
              <View style={{ gap: spacing(2) }}>
                {preview.transfers.map((transfer) => {
                  const transferKey = getTransferKey(transfer);
                  const isDone = doneTransferKeys.includes(transferKey);

                  return (
                    <Pressable
                      key={transferKey}
                      onPress={() => toggleTransferDone(transferKey)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isDone }}
                      accessibilityLabel={isDone ? t('budget.transferMarkNotDone') : t('budget.transferMarkDone')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: spacing(2.5),
                        padding: spacing(3),
                        borderRadius: radius.lg,
                        borderWidth: 1,
                        borderColor: isDone ? colors.success : colors.border,
                        backgroundColor: isDone ? colors.successSoft : colors.surfaceMuted,
                      }}
                    >
                      <Ionicons
                        name={isDone ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={isDone ? colors.success : colors.textSecondary}
                        style={{ marginTop: spacing(0.5) } as any}
                      />
                      <View style={{ flex: 1, gap: spacing(0.5) } as any}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                          <Ionicons name="swap-horizontal-outline" size={16} color={colors.textSecondary} />
                          <Text
                            style={{
                              color: colors.text,
                              fontWeight: String(typography.fontWeight.bold),
                              textDecorationLine: isDone ? 'line-through' : 'none',
                              opacity: isDone ? 0.7 : 1,
                            } as any}
                          >
                            {transfer.title}
                          </Text>
                          {isDone ? (
                            <View style={{ paddingHorizontal: spacing(2), paddingVertical: spacing(0.5), borderRadius: radius.full, backgroundColor: colors.success } as any}>
                              <Text style={{ color: colors.primaryForeground, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.extraBold) } as any}>
                                {t('budget.transferDone')}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={{ color: colors.textSecondary, opacity: isDone ? 0.7 : 1 } as any}>
                          {transfer.section} · {formatCurrency(transfer.amount)} · {' '}
                          {`${t('budget.destinationAccount')}: ${accountNameMap.get(transfer.destinationAccountId) ?? t('budget.selectDestinationAccount')}`}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          ) : null}
        </Section>
      </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(420)}>
      <Card>
        <Section title={t('budget.runsTitle')} subtitle={t('budget.runsSubtitle')} collapsible defaultCollapsed={runs.length > 3}>
          <View style={{ gap: spacing(2.5) }}>
            {runs.map((run: any) => (
              <BudgetRunRow
                key={run.id}
                run={run}
                active={run.id === selectedRun?.id}
                onPress={() => handleSelectRun(run)}
              />
            ))}
          </View>

          {selectedRun ? (
            <View style={{ gap: spacing(2.5) } as any}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), alignItems: 'center' } as any}>
                <Button label={t('budget.loadDraft')} onPress={() => setSelectedRunId(selectedRun.id)} variant="secondary" />
                <Button label={cancelRun.isPending ? t('budget.cancelling') : t('budget.cancelRun')} onPress={() => void cancelRun.mutateAsync(selectedRun.id)} variant="danger" disabled={cancelRun.isPending || selectedRun.status !== 'draft'} />
                <Button label={deleteRunTransactions.isPending ? t('budget.deletingRunTransactions') : t('budget.deleteRunTransactions')} onPress={handleDeleteRunTransactions} variant="danger" disabled={deleteRunTransactions.isPending} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                <Ionicons name="list-outline" size={14} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
                  {t('budget.selectedRunInputs')}: {runInputs.length}
                </Text>
              </View>
              {deleteRunFeedback ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing(1.5),
                    padding: spacing(2.5),
                    borderRadius: radius.lg,
                    backgroundColor: deleteRunFeedback.type === 'error' ? colors.destructiveSoft : colors.successSoft,
                  } as any}
                >
                  <Ionicons
                    name={deleteRunFeedback.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                    size={16}
                    color={deleteRunFeedback.type === 'error' ? colors.destructive : colors.success}
                  />
                  <Text style={{ flex: 1, color: deleteRunFeedback.type === 'error' ? colors.destructive : colors.success, fontWeight: String(typography.fontWeight.semibold) } as any}>
                    {deleteRunFeedback.message}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </Section>
      </Card>
      </Animated.View>

      {/* Keeps the last card clear of the fixed bottom action bar above. */}
      <View style={{ height: spacing(26) } as any} />
    </Page>
  );
}
