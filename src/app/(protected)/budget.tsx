import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Page, Card, Section, Field, Button, Pill, formatCurrency } from '@/components/migrated-page';
import { GroupedAccountSelect } from '@/components/grouped-account-select';
import { GroupedDestinationSelect, type DestinationSelection } from '@/components/grouped-destination-select';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { useAuth } from '../../providers/AuthProvider';
import { useAccounts, useAccountsWithBalances } from '../../features/accounts/hooks';
import { useHouseholdMemberDetails, useMyHouseholds } from '../../features/households/hooks';
import { useRecurringTransactions } from '../../features/recurring-transactions/hooks';
import { useSavingPotAccountAssignments, useSavingPots } from '../../features/saving-pots/hooks';
import {
  useCancelMonthlyBudgetRun,
  useConfirmMonthlyBudgetRun,
  useMonthlyBudgetIncomeInputs,
  useMonthlyBudgetRuns,
  useMonthlyBudgetWorkspace,
  useSaveMonthlyBudgetConfiguration,
  useSaveMonthlyBudgetDraft,
  type MonthlyBudgetIncomeDraft,
  type MonthlyBudgetRuleDraft,
} from '../../features/monthly-budget/hooks';
import { monthlyBudgetService, type MonthlyBudgetPreview } from '../../features/monthly-budget/services/monthly-budget.service';
import type { Database } from '@/types/database.types';
import type { HouseholdMemberDetails } from '../../features/households/hooks';

type AccountLike = {
  id: string;
  household_id: string;
  owner_profile_id: string | null;
  name: string;
  type: Database['public']['Enums']['account_type'];
  currency: Database['public']['Enums']['currency_code'];
  initial_balance: number;
  icon: string | null;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  current_balance?: number | null;
};

type MemberLike = HouseholdMemberDetails;

const SECTION_SORT_ORDER: Record<string, number> = {
  savings: 0,
  investments: 1,
  pots: 2,
  ppr: 3,
  remaining_cash: 4,
};

const MONTH_OPTIONS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

type MemberContributionSummary = {
  label: string;
  section: MonthlyBudgetRuleDraft['section'];
  amount: number;
};

const SHARED_SUMMARY_ID = '__shared__';

function monthKey(value: string) {
  return value.slice(0, 7);
}

function getMemberLabel(member?: MemberLike | null, fallback = 'Shared') {
  if (!member) return fallback;
  return member.fullName?.trim() || member.email || fallback;
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

function formatMonthSelection(months: number[]) {
  if (months.length === 0) return 'All months';

  return months
    .map((month) => MONTH_OPTIONS.find((option) => option.value === month)?.label ?? String(month))
    .join(', ');
}

function getRuleRowKey(index: number, totalRules: number, columns: number) {
  const rowStart = columns === 1 ? index : Math.floor(index / columns) * columns;
  const rowRuleCount = columns === 1 ? 1 : Math.min(columns, totalRules - rowStart);
  const rowEnd = rowStart + rowRuleCount - 1;
  return `${rowStart}-${rowEnd}`;
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

function getSectionBadgeStyle(
  section: MonthlyBudgetRuleDraft['section'],
  colors: any,
) {
  switch (section) {
    case 'savings':
      return { backgroundColor: colors.successSoft, color: colors.success };
    case 'investments':
      return { backgroundColor: colors.warningSoft, color: colors.warning };
    case 'pots':
      return { backgroundColor: colors.primary, color: colors.primaryForeground };
    case 'ppr':
      return { backgroundColor: colors.destructiveSoft, color: colors.destructive };
    case 'remaining_cash':
      return { backgroundColor: colors.muted, color: colors.textSecondary };
    default:
      return { backgroundColor: colors.surfaceMuted, color: colors.textSecondary };
  }
}

function getSectionBadgeIcon(section: MonthlyBudgetRuleDraft['section']) {
  switch (section) {
    case 'savings':
      return 'shield-checkmark-outline';
    case 'investments':
      return 'trending-up-outline';
    case 'pots':
      return 'save-outline';
    case 'ppr':
      return 'shield-outline';
    case 'remaining_cash':
      return 'wallet-outline';
    default:
      return 'layers-outline';
  }
}

function getMemberAccentColor(index: number, colors: any) {
  const palette = [colors.primary, colors.success, colors.warning, colors.destructive];
  return palette[index % palette.length];
}

function createDefaultIncomeDrafts(
  members: MemberLike[],
  accounts: AccountLike[],
  incomeMode: 'shared' | 'individual',
) {
  const sharedCashAccount = pickDefaultAccountId(accounts, null, ['cash', 'bank']);

  return members.map((member) => ({
    memberId: member.userId,
    cashAccountId:
      incomeMode === 'shared'
        ? sharedCashAccount
        : pickDefaultAccountId(accounts, member.userId, ['cash', 'bank']) || sharedCashAccount,
      amount: '',
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
    };
  });
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
  const [fixedRemainingCashAmount, setFixedRemainingCashAmount] = useState('500');
  const [excessCashDistributionMethod, setExcessCashDistributionMethod] = useState<'even_split'>('even_split');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [ruleDrafts, setRuleDrafts] = useState<MonthlyBudgetRuleDraft[]>([]);
  const [incomeDrafts, setIncomeDrafts] = useState<MonthlyBudgetIncomeDraft[]>([]);
  const [collapsedRuleRowKeys, setCollapsedRuleRowKeys] = useState<string[]>([]);
  const [hasLoadedCollapsedPreference, setHasLoadedCollapsedPreference] = useState(false);

  const hydratedConfigId = useRef<string | null>(null);
  const hydratedWorkspaceSignature = useRef<string | null>(null);
  const hydratedRunId = useRef<string | null>(null);
  const hydratedCollapsedPreferenceKey = useRef<string | null>(null);
  const collapsedPreferenceDirtyRef = useRef(false);
  const collapsedStateKey = householdId ? `smartfinance:monthly-budget:collapsed-rows:${householdId}` : null;

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
    [workspace?.config?.id, workspace?.config?.name, workspace?.rules],
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
      setIncomeDrafts(mapIncomeInputsToDrafts(runIncomeInputsQuery.data as any[], members, accounts));
      if (selectedRun.month) setMonth(monthKey(selectedRun.month));
      return;
    }

    if (members.length > 0 && accounts.length > 0 && !runIncomeInputsQuery.isFetching) {
      hydratedRunId.current = selectedRun.id;
      setIncomeDrafts(createDefaultIncomeDrafts(members, accounts, incomeMode));
      if (selectedRun.month) setMonth(monthKey(selectedRun.month));
    }
  }, [accounts, householdId, incomeMode, members, runIncomeInputsQuery.data, runIncomeInputsQuery.isFetching, selectedRun?.id, selectedRun?.month]);

  useEffect(() => {
    if (selectedRun?.id) return;
    if (members.length > 0 && accounts.length > 0 && incomeDrafts.length === 0) {
      setIncomeDrafts(createDefaultIncomeDrafts(members, accounts, incomeMode));
    }
  }, [accounts, householdId, incomeDrafts.length, incomeMode, members, selectedRun?.id]);

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
    if (!collapsedStateKey || typeof window === 'undefined' || ruleDrafts.length === 0) return;
    if (hydratedCollapsedPreferenceKey.current === collapsedStateKey) return;

    const raw = window.localStorage.getItem(collapsedStateKey);

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
    if (!collapsedStateKey || typeof window === 'undefined' || !hasLoadedCollapsedPreference) return;
    if (!collapsedPreferenceDirtyRef.current && window.localStorage.getItem(collapsedStateKey) === null) return;
    window.localStorage.setItem(collapsedStateKey, JSON.stringify(collapsedRuleRowKeys));
  }, [collapsedRuleRowKeys, collapsedStateKey, hasLoadedCollapsedPreference]);

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

  const rulesAreValid = ruleDrafts.every((rule) => {
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
  });

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
  const effectiveAllRulesCollapsed = allRulesCollapsed;
  const configReady = Boolean(householdId && profile?.id && budgetName.trim() && rulesAreValid);
  const draftReady = Boolean(configId && configReady && preview.validationIssues.length === 0);
  const selectedRunDraftReady = Boolean(selectedRun?.id && selectedRun.status === 'draft' && preview.validationIssues.length === 0);

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
    if (!householdId || !profile?.id || !selectedRun?.id) return;

    await confirmRun.mutateAsync({
      runId: selectedRun.id,
      householdId,
      month,
      preview,
      createdBy: profile.id,
    });
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
      actions={
        <View style={{ gap: spacing(2) }}>
          <Button label={saveConfiguration.isPending ? t('saving') : t('budget.saveConfiguration')} onPress={() => void handleSaveConfiguration()} disabled={!configReady || saveConfiguration.isPending} />
          <Button label={saveDraft.isPending ? t('saving') : t('budget.saveDraft')} onPress={() => void handleSaveDraft()} variant="secondary" disabled={!draftReady || saveDraft.isPending} />
          <Button label={confirmRun.isPending ? t('budget.generating') : t('budget.confirmMonth')} onPress={() => void handleConfirmRun()} disabled={!selectedRunDraftReady || confirmRun.isPending} />
        </View>
      }
    >
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
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                overflow: 'hidden',
              } as any}
            >
              {resumeRows.map((row, index) => (
                <View
                  key={row.label}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: spacing(3),
                    paddingVertical: spacing(2.5),
                    paddingHorizontal: spacing(3),
                    backgroundColor: index % 2 === 0 ? colors.surfaceMuted : colors.muted,
                    borderBottomWidth: index === resumeRows.length - 1 ? 0 : 1,
                    borderBottomColor: colors.border,
                  } as any}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                    <Ionicons name={row.icon} size={14} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
                      {row.label}
                    </Text>
                  </View>
                  <Text style={{ color: row.label === t('budget.budgetStatus') ? budgetStatusColor : colors.text, fontWeight: String(row.label === t('budget.budgetStatus') ? typography.fontWeight.extraBold : typography.fontWeight.bold) } as any}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: spacing(3),
                paddingVertical: spacing(2.5),
                paddingHorizontal: spacing(3),
                borderTopWidth: 1,
                borderTopColor: colors.border,
                backgroundColor: colors.surfaceMuted,
                borderRadius: radius.lg,
              } as any}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                <Ionicons name="layers-outline" size={16} color={colors.text} />
                <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.extraBold) } as any}>
                  {t('budget.configuredTotal')}
                </Text>
              </View>
              <Text style={{ color: colors.primary, fontWeight: String(typography.fontWeight.extraBold) } as any}>
                {formatCurrency(preview.configuredTotal)}
              </Text>
            </View>
            <View style={{ gap: spacing(1.5), marginTop: spacing(1) } as any}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.extraBold), textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10] } as any}>
                  {t('budget.perPerson')}
                </Text>
              </View>
              <View style={{ gap: spacing(1) } as any}>
                {memberSummaryRows.map((row, index) => {
                  const accentColor = getMemberAccentColor(index, colors);
                  return (
                  <View
                    key={row.id}
                    style={{
                      gap: spacing(3),
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing(3) } as any}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                        <Ionicons name="person-circle-outline" size={16} color={accentColor} />
                        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.semibold) } as any}>
                          {row.label}
                        </Text>
                      </View>
                      <Text style={{ color: accentColor, fontWeight: String(typography.fontWeight.bold) } as any}>
                        {row.value}
                      </Text>
                    </View>
                    {row.contributions.length > 0 ? (
                      <View style={{ gap: spacing(1) } as any}>
                        {row.contributions.map((contribution, contributionIndex) => (
                          <View
                            key={`${row.id}-${contribution.section}-${contribution.label}-${contributionIndex}`}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: spacing(2),
                            } as any}
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
                      </View>
                    ) : null}
                  </View>
                  );
                })}
              </View>
            </View>
          </View>
        </Section>
      </Card>

      <Card>
        <Section title={t('budget.householdSettings')} subtitle={t('budget.householdSettingsSubtitle')}>
          <Field label={t('budget.name')} value={budgetName} onChangeText={setBudgetName} placeholder={t('budget.namePlaceholder')} />
          <Field label={t('budget.month')} value={month} onChangeText={setMonth} placeholder="YYYY-MM" />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.incomeMode')}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {(['shared', 'individual'] as const).map((item) => (
              <Pill key={item} label={t(`budget.incomeModes.${item}`)} active={incomeMode === item} onPress={() => setIncomeMode(item)} />
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name="wallet-outline" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.remainingCashStrategy')}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {(['keep', 'fixed'] as const).map((item) => (
              <Pill key={item} label={t(`budget.remainingCashStrategies.${item}`)} active={remainingCashStrategy === item} onPress={() => setRemainingCashStrategy(item)} />
            ))}
          </View>

          <Field label={t('budget.fixedRemainingCashAmount')} value={fixedRemainingCashAmount} onChangeText={setFixedRemainingCashAmount} keyboardType="numeric" placeholder="0.00" />
        </Section>
      </Card>

      <Card>
        <Section title={t('budget.monthlyInputs')} subtitle={t('budget.monthlyInputsSubtitle')}>
          <View style={{ gap: spacing(3) }}>
            {members.map((member) => {
              const draft = incomeDrafts.find((item) => item.memberId === member.userId);

              return (
                <View key={member.userId} style={{ gap: spacing(2), paddingBottom: spacing(3), borderBottomWidth: 1, borderBottomColor: colors.border } as any}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                    <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{getMemberLabel(member)}</Text>
                  </View>
                  <Field
                    label={t('budget.salary')}
                    value={draft?.amount ?? ''}
                    onChangeText={(value) => updateIncomeDraft(member.userId, { amount: value })}
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                  <GroupedAccountSelect
                    label={t('budget.cashAccount')}
                    accounts={accounts}
                    members={members}
                    value={draft?.cashAccountId ?? ''}
                    placeholder={t('budget.selectCashAccount')}
                    hint={t('budget.cashAccountHint')}
                    allowedTypes={['cash', 'bank']}
                    sharedLabel={t('budget.shared')}
                    unassignedLabel={t('settings.unnamedUser')}
                    closeLabel={t('cancel')}
                    onChange={(accountId) => updateIncomeDraft(member.userId, { cashAccountId: accountId })}
                  />
                </View>
              );
            })}
          </View>
        </Section>
      </Card>

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
            <View style={{ height: spacing(2), borderRadius: radius.full, backgroundColor: colors.surfaceMuted, overflow: 'hidden' } as any}>
              <View
                style={{
                  width: `${Math.min(100, preview.incomeTotal > 0 ? (preview.configuredTotal / preview.incomeTotal) * 100 : 0)}%`,
                  height: '100%',
                  borderRadius: radius.full,
                  backgroundColor: colors.primary,
                } as any}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) } as any}>
            {ruleDrafts.map((rule, index) => {
              const destinationLabel = accountNameMap.get(rule.destinationAccountId) ?? t('budget.selectDestinationAccount');
              const activeMonthsLabel = formatMonthSelection(rule.activeMonths);
              const rowStart = ruleColumns === 1 ? index : Math.floor(index / ruleColumns) * ruleColumns;
              const rowRuleCount = ruleColumns === 1 ? 1 : Math.min(ruleColumns, ruleDrafts.length - rowStart);
              const rowEnd = rowStart + rowRuleCount - 1;
              const rowKey = `${rowStart}-${rowEnd}`;
              const isCollapsed = effectiveCollapsedRuleRowKeys.includes(rowKey);

              return (
                <View
                  key={rule.id}
                  style={[
                    { gap: spacing(3), padding: spacing(3.5), borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
                    ruleCardStyle,
                  ] as any}
                >
                  <Pressable
                    onPress={() => toggleRuleCollapsed(rule.id)}
                    style={({ pressed }) => [
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: spacing(2),
                        opacity: pressed ? 0.9 : 1,
                      },
                    ] as any}
                  >
                    <View style={{ flex: 1, gap: spacing(1) } as any}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing(2) } as any}>
                        <Ionicons name={getSectionBadgeIcon(rule.section)} size={16} color={colors.textSecondary} />
                        <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold } as any}>
                          {rule.name || t('budget.ruleNamePlaceholder')}
                        </Text>
                        {(() => {
                          const badge = getSectionBadgeStyle(rule.section, colors);
                          return (
                            <View style={{ paddingHorizontal: spacing(2), paddingVertical: spacing(0.75), borderRadius: radius.full, backgroundColor: badge.backgroundColor } as any}>
                              <Text style={{ color: badge.color, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.extraBold), letterSpacing: typography.letterSpacing[10], textTransform: 'uppercase' } as any}>
                                {t(`budget.sections.${rule.section}`)}
                              </Text>
                            </View>
                          );
                        })()}
                      </View>
                      <Text style={{ color: colors.textSecondary } as any}>
                        {formatCurrency(Number(rule.amount || 0))}
                        {' · '}
                        <Ionicons name="swap-horizontal-outline" size={12} color={colors.textSecondary} /> {t('budget.sourceAccount')}: {accountNameMap.get(rule.sourceAccountId) ?? t('budget.selectSourceAccount')}
                        {' · '}
                        <Ionicons name="wallet-outline" size={12} color={colors.textSecondary} /> {t('budget.destinationAccount')}: {destinationLabel}
                      </Text>
                    </View>
                    <Ionicons name={isCollapsed ? 'chevron-forward-outline' : 'chevron-down-outline'} size={18} color={colors.textSecondary} />
                  </Pressable>

                  {!isCollapsed ? (
                    <>
                      <Field
                        label={t('budget.ruleName')}
                        value={rule.name}
                        onChangeText={(value) => updateRuleDraft(rule.id, { name: value })}
                        placeholder={t('budget.ruleNamePlaceholder')}
                      />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                        <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.section')}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                        {(['savings', 'pots', 'investments', 'ppr', 'remaining_cash'] as const).map((section) => (
                          <Pill key={section} label={t(`budget.sections.${section}`)} active={rule.section === section} onPress={() => updateRuleDraft(rule.id, { section })} />
                        ))}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                        <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.owner')}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                        <Pill label={t('budget.shared')} active={!rule.ownerMemberId} onPress={() => updateRuleDraft(rule.id, { ownerMemberId: null })} />
                        {members.map((member) => (
                          <Pill key={member.userId} label={getMemberLabel(member)} active={rule.ownerMemberId === member.userId} onPress={() => updateRuleDraft(rule.id, { ownerMemberId: member.userId })} />
                        ))}
                      </View>
                      <View style={{ gap: spacing(2) } as any}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                          <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
                            {t('budget.activeMonths')}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) }}>
                          {MONTH_OPTIONS.map((option) => (
                            <Pill
                              key={option.value}
                              label={option.label}
                              active={rule.activeMonths.includes(option.value)}
                              onPress={() => updateRuleActiveMonths(rule.id, option.value)}
                            />
                          ))}
                        </View>
                        <Text style={{ color: colors.textSecondary } as any}>
                          {activeMonthsLabel}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                          <Field
                            label={t('budget.activeFromMonth')}
                            value={rule.activeFromMonth}
                            onChangeText={(value) => updateRuleDraft(rule.id, { activeFromMonth: value })}
                            keyboardType="numeric"
                            placeholder="1"
                            style={{ flex: 1, minWidth: 140 }}
                          />
                          <Field
                            label={t('budget.activeToMonth')}
                            value={rule.activeToMonth}
                            onChangeText={(value) => updateRuleDraft(rule.id, { activeToMonth: value })}
                            keyboardType="numeric"
                            placeholder="12"
                            style={{ flex: 1, minWidth: 140 }}
                          />
                        </View>
                      </View>
                      <GroupedAccountSelect
                        label={t('budget.sourceAccount')}
                        accounts={incomeCashAccounts.length > 0 ? incomeCashAccounts : accounts}
                        members={members}
                        value={rule.sourceAccountId}
                        placeholder={t('budget.selectSourceAccount')}
                        hint={t('budget.sourceAccountHint')}
                        allowedTypes={['cash', 'bank']}
                        allowedAccountIds={incomeCashAccountIds}
                        sharedLabel={t('budget.shared')}
                        unassignedLabel={t('settings.unnamedUser')}
                        closeLabel={t('cancel')}
                        onChange={(accountId) => updateRuleDraft(rule.id, { sourceAccountId: accountId })}
                      />
                      <GroupedDestinationSelect
                        label={t('budget.destinationAccount')}
                        accounts={accounts}
                        members={members}
                        value={{ kind: 'account', id: rule.destinationAccountId }}
                        placeholder={t('budget.selectDestinationAccount')}
                        hint={t('budget.destinationSelectorHint')}
                        groupBy="type"
                        typeLabels={destinationAccountTypeLabels}
                        sharedLabel={t('budget.shared')}
                        unassignedLabel={t('settings.unnamedUser')}
                        closeLabel={t('cancel')}
                        potNameByAccountId={potNameByAccountId}
                        potLabel={t('budget.pigBank')}
                        onChange={(selection) => updateDestinationDraft(rule.id, selection)}
                      />
                      <Field
                        label={t('budget.amount')}
                        value={rule.amount}
                        onChangeText={(value) => updateRuleDraft(rule.id, { amount: value })}
                        keyboardType="numeric"
                        placeholder="0.00"
                      />
                      <Field
                        label={t('budget.priority')}
                        value={rule.priority}
                        onChangeText={(value) => updateRuleDraft(rule.id, { priority: value })}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </>
                  ) : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                    <Pill label={rule.isActive ? t('budget.active') : t('budget.inactive')} active={rule.isActive} onPress={() => updateRuleDraft(rule.id, { isActive: !rule.isActive })} />
                    <Button label={t('delete')} onPress={() => removeRule(rule.id)} variant="danger" />
                  </View>
                </View>
              );
            })}
          </View>
        </Section>
      </Card>

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

          <View style={{ gap: spacing(2) }}>
            {preview.transfers.map((transfer) => (
              <View key={`${transfer.ruleId ?? transfer.title}-${transfer.destinationAccountId}`} style={{ padding: spacing(3), borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted } as any}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                  <Ionicons name="swap-horizontal-outline" size={16} color={colors.textSecondary} />
                  <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{transfer.title}</Text>
                </View>
                <Text style={{ color: colors.textSecondary } as any}>
                  {transfer.section} · {formatCurrency(transfer.amount)} · {' '}
                  {`${t('budget.destinationAccount')}: ${accountNameMap.get(transfer.destinationAccountId) ?? t('budget.selectDestinationAccount')}`}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      </Card>

      <Card>
        <Section title={t('budget.runsTitle')} subtitle={t('budget.runsSubtitle')}>
          <View style={{ gap: spacing(2.5) }}>
            {runs.map((run: any) => {
              const active = run.id === selectedRun?.id;
              return (
                <Pressable
                  key={run.id}
                  onPress={() => handleSelectRun(run)}
                  style={({ pressed }) => [
                    {
                      padding: spacing(3.5),
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : colors.surfaceMuted,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ] as any}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                    <Ionicons name="calendar-outline" size={16} color={active ? colors.primaryForeground : colors.textSecondary} />
                    <Text style={{ color: active ? colors.primaryForeground : colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>
                      {monthKey(run.month)} · {run.status}
                    </Text>
                  </View>
                  <Text style={{ color: active ? colors.primaryForeground : colors.textSecondary } as any}>
                    {t('budget.runPreview')}: {formatCurrency(Number((run.preview_snapshot as any)?.remainingCash ?? 0))}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedRun ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), alignItems: 'center' }}>
              <Button label={t('budget.loadDraft')} onPress={() => setSelectedRunId(selectedRun.id)} variant="secondary" />
              <Button label={cancelRun.isPending ? t('budget.cancelling') : t('budget.cancelRun')} onPress={() => void cancelRun.mutateAsync(selectedRun.id)} variant="danger" disabled={cancelRun.isPending || selectedRun.status !== 'draft'} />
              <Text style={{ color: colors.textSecondary }}>
                {t('budget.selectedRunInputs')}: {runInputs.length}
              </Text>
            </View>
          ) : null}
        </Section>
      </Card>
    </Page>
  );
}
