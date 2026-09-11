import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Page, Card, Section, Button, formatCurrency } from '@/components/migrated-page';
import { MonthPickerField } from '@/components/date-picker-field';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsiveMetrics } from '@/theme/responsive';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { getPersistentString, setPersistentString } from '@/shared/lib/persistent-storage';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';
import { useToast } from '@/providers/ToastProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useAccounts, useAccountsWithBalances } from '../../features/accounts/hooks';
import { useCategories } from '../../features/categories/hooks';
import { useHouseholdMemberDetails } from '../../features/households/hooks';
import { IncomeSourcesSection } from '../../features/income-sources/components/income-sources-section';
import {
  useConfirmPlannedItemMonth,
  useMonthlyBudgetPeriod,
  usePlannedItems,
  usePlannedItemsPreview,
  useRecentPlannedMonthsSummary,
  useRevertMonthlyBudgetMonth,
} from '../../features/planned-items/hooks';
import { PlannedItemsSection } from '../../features/planned-items/components/planned-items-section';
import { buildMonthlyPreviewViewModel } from '../../features/planned-items/services/monthly-preview-view-model';
import type {
  MonthlyPreviewAccount,
  MonthlyPreviewAccountImpact,
  MonthlyPreviewSegmentKey,
} from '../../features/planned-items/services/monthly-preview-view-model';
import type { ResolvedMonth } from '../../features/planned-items/types';
import { getMemberLabel } from '../../features/monthly-budget/ui-utils';
import type { BudgetAccountLike, BudgetMemberLike } from '../../features/monthly-budget/types';

type AccountLike = BudgetAccountLike;
type MemberLike = BudgetMemberLike;

function monthKey(value: string) {
  return value.slice(0, 7);
}

function getTransferKey(entry: { plannedItemId: string; destinationAccountId: string }) {
  return `${entry.plannedItemId}-${entry.destinationAccountId}`;
}

// react-native-web ships Alert.alert() as a literal no-op stub (see
// node_modules/react-native-web/src/exports/Alert/index.js -- `static
// alert() {}`, no web modal is implemented at all) -- calling it on web
// silently does nothing: no dialog, no error, nothing. This affects
// every Alert.alert(...) confirmation in this codebase when run on web
// (members.tsx's remove-member flow included), not just this screen.
// Falls back to the browser's built-in window.confirm on web so the
// destructive action still requires an explicit yes -- native keeps
// using the real Alert.alert with its title/message/destructive style.
function confirmDestructiveAction(title: string, message: string, confirmLabel: string, cancelLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

// Zeroed-out ResolvedMonth stand-in used only before usePlannedItemsPreview
// has resolved once -- keeps buildMonthlyPreviewViewModel (and therefore
// every value the redesigned Monthly Preview reads) always defined, so
// the JSX below never needs its own "still loading" branch. Same
// zero-fallback spirit as the pre-redesign screen's own `summary` default.
const EMPTY_RESOLVED_MONTH: ResolvedMonth = {
  month: '',
  occurrences: [],
  summary: { income: 0, plannedExpenses: 0, estimatedExpenses: 0, savings: 0, investments: 0, available: 0 },
};

const SEGMENT_ORDER: MonthlyPreviewSegmentKey[] = ['expenses', 'savings', 'investments', 'remaining', 'overBudget'];

/**
 * Monthly Budget screen -- Phase 5+7 cutover of the ground-up rebuild (see
 * src/features/planned-items/ for the new backend this now runs on
 * entirely: types.ts, services/planned-items.service.ts,
 * services/planned-items-confirm.service.ts, hooks/index.ts).
 *
 * What changed from the pre-rebuild screen:
 *  - The Budget Rules table and the Recurring Expenses section are gone,
 *    replaced by ONE unified `PlannedItemsSection` (direction='outflow')
 *    -- a plain expense, an estimate, and a multi-account savings/
 *    investment transfer are all just planned_items now, distinguished by
 *    isEstimate + how many destinations they fan out to (see
 *    planned-item-destinations-editor.tsx's doc comment for the
 *    allocation-mode UX this replaced the old 2-mode rule editor with).
 *  - Income Sources keeps its own section (approved design decision: same
 *    backend table, direction='inflow', distinct UI) -- see
 *    income-sources-section.tsx, now a thin wrapper around the same
 *    PlannedItemsSection/PlannedItemCard.
 *  - The whole monthly_budget_configs/monthly_budget_rules/
 *    monthly_budget_runs "build a config, save a draft run, confirm the
 *    run" flow is gone. There is no separate "save draft" step anymore --
 *    usePlannedItemsPreview both resolves AND materializes a month on
 *    every read (see that hook's own doc comment), so simply having the
 *    screen open for a month keeps its occurrences up to date. The only
 *    remaining action is "Run monthly budget", which turns the
 *    household's MonthlyBudgetPeriod for that month into 'committed' and
 *    posts the real transactions (useConfirmPlannedItemMonth).
 *  - Month-lock now reads MonthlyBudgetPeriod.status ('committed' or
 *    'closed') via useMonthlyBudgetPeriod instead of the old
 *    monthly_budget_runs.status === 'confirmed'.
 *
 * Monthly Preview redesign (this pass): the old preview mixed an
 * "Income / Planned expenses / Available / Into savings" hero card, a
 * near-duplicate "Income / 3 stat cards / 4 breakdown rows" section, and
 * a trend chart, with several numbers derived from overlapping totals --
 * most importantly, `summary.plannedExpenses` counts every outflow
 * occurrence including ones that are themselves a transfer into a
 * savings/investment account, so "Planned expenses" and "Into savings"
 * silently double-counted the same money. Replaced with ONE preview built
 * from a single normalized view model (see
 * services/monthly-preview-view-model.ts's own doc comment for the exact
 * math/rationale): a hero income figure, one segmented allocation bar
 * (Expenses / Savings / Investments / Remaining, always summing to the
 * month's own total), an expandable Allocation Breakdown, a new Account
 * Impact section (before/change/after per account, reusing the real
 * balances `useAccountsWithBalances` already loads), a restructured
 * Transfers execution checklist, and an optional "compared with last
 * month" block. The old Tendência trend chart is gone from this screen
 * entirely (per the redesign brief -- historical trend data still exists
 * via useRecentPlannedMonthsSummary for a future Monthly Budget
 * history/overview screen, just not rendered here).
 *
 * Deliberately dropped, not replaced: the old "Household Settings" card
 * (budget name / income mode / remaining cash strategy) existed purely to
 * configure the now-gone monthly_budget_configs row, and remaining_cash_
 * strategy in particular has no consumer left -- MonthlyBudgetSummary
 * infers savings/investments from each destination account's own type,
 * never from a household-level strategy setting. Likewise the old
 * "Monthly runs" history list (monthly_budget_runs) has no replacement
 * here; browsing period history was not asked for in this cutover.
 */
export default function BudgetScreen() {
  const { t, i18n } = useTranslation('common');
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  // This screen's `overlay` is a fixed bottom action bar (see below), not
  // scroll content, so it needs its own bottom-inset padding or the
  // confirm button sits under the Android system nav bar / iOS home
  // indicator.
  const insets = useSafeAreaInsets();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const { householdId, profile } = useAuth();
  const { show: showToast } = useToast();
  // "Edit budget" (bottom action bar) scrolls back up to the Income
  // Sources / Planned Items sections rather than opening a separate
  // editor screen -- there isn't a separate edit mode, editing already
  // happens on this same page above the preview.
  const scrollRef = useRef<ScrollView>(null);
  function scrollToEditableSections() {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  const accountsQuery = useAccounts();
  const accountBalancesQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const allocationCategoriesQuery = useCategories('expense');
  const incomeCategoriesQuery = useCategories('income');

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

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const normalizedMonth = monthKey(month);
  // Human-readable label for the confirm/reset dialogs, toasts, and the
  // "Monthly Preview -- {{month}}" header -- formatted in the app's
  // selected language, same toLocaleDateString(..., { month: 'long',
  // year: 'numeric' }) convention date-picker-field.tsx already uses for
  // a month/year label.
  const normalizedMonthLabel = useMemo(() => {
    const [year, monthNumber] = normalizedMonth.split('-').map(Number);
    if (!year || !monthNumber) return normalizedMonth;
    return new Date(year, monthNumber - 1, 1).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
  }, [normalizedMonth, i18n.language]);

  const periodQuery = useMonthlyBudgetPeriod(normalizedMonth);
  const isMonthLocked = periodQuery.data?.status === 'committed' || periodQuery.data?.status === 'closed';
  const lockToastMonthRef = useRef<string | null>(null);
  useEffect(() => {
    if (isMonthLocked) {
      if (lockToastMonthRef.current !== normalizedMonth) {
        lockToastMonthRef.current = normalizedMonth;
        showToast(t('budget.monthLockedToast'));
      }
    } else {
      lockToastMonthRef.current = null;
    }
  }, [isMonthLocked, normalizedMonth, showToast, t]);

  // Shared with both PlannedItemsSection instances (outflow below, inflow
  // inside IncomeSourcesSection) -- same react-query key
  // (["planned-items-preview", householdId, month]), so this is one
  // network round trip, not three.
  const previewQuery = usePlannedItemsPreview(normalizedMonth);
  const resolved = previewQuery.data ?? EMPTY_RESOLVED_MONTH;
  const itemsQuery = usePlannedItems();
  const items = itemsQuery.data ?? [];
  const itemNameById = useMemo(() => new Map(items.map((item) => [item.id, item.name])), [items]);
  // Owner-per-account, not owner-per-planned-item: planned items'
  // owner_member_id is optional and often left unset, while every
  // account already has a stable owner_profile_id -- reusing that
  // existing account-ownership data groups both the Transfers list and
  // the new Account Impact section more reliably (see
  // groupedTransferEntries and accountImpactGroups below).
  const accountOwnerProfileById = useMemo(() => new Map(accounts.map((account) => [account.id, account.owner_profile_id])), [accounts]);
  const accountNameMap = useMemo(() => new Map(accounts.map((account) => [account.id, account.name])), [accounts]);
  const categoryNameMap = useMemo(
    () => new Map((allocationCategoriesQuery.data ?? []).map((category) => [category.id, category.name])),
    [allocationCategoriesQuery.data],
  );

  const confirmMonth = useConfirmPlannedItemMonth();
  const revertMonth = useRevertMonthlyBudgetMonth();

  // accountId -> account_type, fed to useRecentPlannedMonthsSummary so its
  // historical `expenses`/`savings`/`investments` split stays consistent
  // with this month's own (see that hook's doc comment) -- built from the
  // same `accounts` this screen already loaded, no second accounts query.
  const accountTypeById = useMemo(() => new Map(accounts.map((account) => [account.id, account.type])), [accounts]);
  const trendQuery = useRecentPlannedMonthsSummary(6, accountTypeById);
  const trendEntries = trendQuery.data ?? [];
  // The one prior-month entry (if any) already fetched above, reused here
  // rather than a second query -- only 'confirmed'/'matched' months ever
  // appear in trendEntries, so this is naturally absent for a household's
  // first month or a month with a gap right before it, in which case
  // buildMonthlyPreviewViewModel's `comparedWithLastMonth` comes back
  // null and the "Compared with last month" block hides entirely.
  const previousMonthComparison = useMemo(() => {
    const [year, monthNumber] = normalizedMonth.split('-').map(Number);
    if (!year || !monthNumber) return null;
    const previous = new Date(year, monthNumber - 2, 1);
    const previousKey = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
    const entry = trendEntries.find((candidate) => candidate.month === previousKey);
    if (!entry) return null;
    return { income: entry.income, expenses: entry.expenses, savings: entry.savings, investments: entry.investments, remaining: entry.remainingCash };
  }, [normalizedMonth, trendEntries]);

  const accountsForViewModel = useMemo<MonthlyPreviewAccount[]>(
    () =>
      accounts.map((account) => ({
        id: account.id,
        type: account.type,
        ownerProfileId: account.owner_profile_id,
        currentBalance: account.current_balance ?? 0,
      })),
    [accounts],
  );

  // The one normalized view model the whole redesigned preview reads from
  // -- see monthly-preview-view-model.ts's own doc comment for why
  // (avoids the old screen's several overlapping totals, keeps the money
  // math in one pure/testable place separate from this component).
  const viewModel = useMemo(
    () => buildMonthlyPreviewViewModel({ resolved, accounts: accountsForViewModel, previousMonth: previousMonthComparison }),
    [resolved, accountsForViewModel, previousMonthComparison],
  );

  // Tracks which of this month's transfers the user has already carried
  // out manually (planned items only ever generate a plan/real ledger
  // transaction for the app's own records -- nothing here moves money at
  // an actual bank automatically), so re-opening the budget later still
  // shows what's left to do. Keyed per household+month, same convention
  // as before the cutover.
  const [doneTransferKeys, setDoneTransferKeys] = useState<string[]>([]);
  const doneTransfersStateKey = householdId ? `kintally:monthly-budget:done-transfers:${householdId}:${normalizedMonth}` : null;
  const hydratedDoneTransfersKey = useRef<string | null>(null);

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

  function toggleTransferDone(key: string) {
    setDoneTransferKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  const transferEntries = useMemo(() => {
    const entries: Array<{
      key: string;
      title: string;
      amount: number;
      sourceAccountId: string | null;
      destinationAccountId: string;
      categoryId: string | null;
      ownerMemberId: string | null;
    }> = [];
    for (const item of resolved.occurrences) {
      if (!item.isValid) continue;
      for (const destination of item.destinations) {
        entries.push({
          key: getTransferKey({ plannedItemId: item.occurrence.plannedItemId, destinationAccountId: destination.destinationAccountId }),
          title: itemNameById.get(item.occurrence.plannedItemId) ?? '',
          amount: destination.amount,
          sourceAccountId: item.occurrence.sourceAccountId,
          destinationAccountId: destination.destinationAccountId,
          categoryId: destination.categoryId,
          // Owner comes from the destination (target) account -- reuses
          // accounts.owner_profile_id, the same account-ownership data
          // used everywhere else in this screen, not a new ownership
          // concept. Null (a shared/household account) groups under
          // budget.shared below.
          ownerMemberId: accountOwnerProfileById.get(destination.destinationAccountId) ?? null,
        });
      }
    }
    return entries;
  }, [resolved, itemNameById, accountOwnerProfileById]);

  // Groups the flat transfer list by owner for display -- one section per
  // member (their name, resolved the same way account/member labels are
  // resolved everywhere else in this screen), with unowned/shared items
  // in their own group rendered last.
  const groupedTransferEntries = useMemo(() => {
    const groups = new Map<string, { ownerMemberId: string | null; label: string; entries: typeof transferEntries }>();
    for (const entry of transferEntries) {
      const groupKey = entry.ownerMemberId ?? '__shared__';
      let group = groups.get(groupKey);
      if (!group) {
        const label = entry.ownerMemberId
          ? getMemberLabel(members.find((member) => member.userId === entry.ownerMemberId), t('budget.shared'))
          : t('budget.shared');
        group = { ownerMemberId: entry.ownerMemberId, label, entries: [] };
        groups.set(groupKey, group);
      }
      group.entries.push(entry);
    }
    const ordered = [...groups.values()];
    ordered.sort((a, b) => {
      if (a.ownerMemberId === null && b.ownerMemberId !== null) return 1;
      if (a.ownerMemberId !== null && b.ownerMemberId === null) return -1;
      return a.label.localeCompare(b.label);
    });
    return ordered;
  }, [transferEntries, members, t]);

  // Same owner-grouping as Transfers, applied to the new Account Impact
  // section's `viewModel.accountImpacts` -- deliberately reuses the exact
  // same accountOwnerProfileById/getMemberLabel resolution rather than a
  // second ownership concept.
  const accountImpactGroups = useMemo(() => {
    const groups = new Map<string, { ownerProfileId: string | null; label: string; impacts: MonthlyPreviewAccountImpact[] }>();
    for (const impact of viewModel.accountImpacts) {
      const groupKey = impact.ownerProfileId ?? '__shared__';
      let group = groups.get(groupKey);
      if (!group) {
        const label = impact.ownerProfileId
          ? getMemberLabel(members.find((member) => member.userId === impact.ownerProfileId), t('budget.shared'))
          : t('budget.shared');
        group = { ownerProfileId: impact.ownerProfileId, label, impacts: [] };
        groups.set(groupKey, group);
      }
      group.impacts.push(impact);
    }
    const ordered = [...groups.values()];
    ordered.sort((a, b) => {
      if (a.ownerProfileId === null && b.ownerProfileId !== null) return 1;
      if (a.ownerProfileId !== null && b.ownerProfileId === null) return -1;
      return a.label.localeCompare(b.label);
    });
    return ordered;
  }, [viewModel.accountImpacts, members, t]);

  function accountTypeGroupLabel(accountType: MonthlyPreviewAccountImpact['accountType']): string {
    if (accountType === 'savings') return t('budget.accountTypeSavings');
    if (accountType === 'investment' || accountType === 'ppr') return t('budget.accountTypeInvestments');
    return t('budget.accountTypeCurrent');
  }

  // Sub-groups one owner's accounts by type bucket ONLY when that owner
  // actually has more than one bucket represented -- keeps the common
  // case (one owner, all checking accounts) flat and un-cluttered while
  // still satisfying "if applicable, also group by account type" for a
  // household that mixes current/savings/investment accounts under the
  // same person.
  function groupImpactsByType(impacts: MonthlyPreviewAccountImpact[]): Array<{ typeLabel: string | null; impacts: MonthlyPreviewAccountImpact[] }> {
    const buckets = new Map<string, MonthlyPreviewAccountImpact[]>();
    for (const impact of impacts) {
      const bucketKey = accountTypeGroupLabel(impact.accountType);
      const bucket = buckets.get(bucketKey) ?? [];
      bucket.push(impact);
      buckets.set(bucketKey, bucket);
    }
    if (buckets.size <= 1) return [{ typeLabel: null, impacts }];
    return [...buckets.entries()].map(([typeLabel, bucketImpacts]) => ({ typeLabel, impacts: bucketImpacts }));
  }

  const validationIssues = useMemo(
    () => resolved.occurrences.filter((item) => !item.isValid).flatMap((item) => item.validationIssues),
    [resolved],
  );

  const confirmReady = Boolean(householdId && profile?.id && !isMonthLocked && validationIssues.length === 0);
  const actionHint = isMonthLocked
    ? t('budget.monthAlreadyConfirmed')
    : validationIssues.length > 0
      ? t('budget.confirmMonthHint')
      : null;

  async function handleConfirmMonth() {
    if (!confirmReady) return;
    await confirmMonth.mutateAsync(normalizedMonth);
  }

  // Deletes every transaction this month's confirm generated and reopens
  // the month -- the escape hatch for "I confirmed the wrong month" / "I
  // want to redo this month's transfers". Destructive (real transactions
  // get deleted), so it's gated behind a confirmation dialog, same
  // pattern as members.tsx's handleRemoveMember.
  function handleRevertMonth() {
    if (!householdId || revertMonth.isPending) return;
    confirmDestructiveAction(
      t('budget.revertMonthTitle', { month: normalizedMonthLabel }),
      t('budget.revertMonthMessage'),
      t('budget.revertMonthConfirm'),
      t('cancel'),
      () => {
        void revertMonth
          .mutateAsync(normalizedMonth)
          .then(() => showToast(t('budget.revertMonthSuccess', { month: normalizedMonthLabel })))
          .catch((err: unknown) => {
            // Surface the backend's own reason when it has one (e.g.
            // the 'used in a replenishment run' guard) instead of a
            // generic message -- this is a destructive action, so a
            // vague failure is worse than usual here.
            // Not necessarily an Error instance -- supabase-js RPC
            // errors (PostgrestError) are duck-typed the same way
            // across versions, so check for a string .message rather
            // than relying on instanceof.
            const detail =
              err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
                ? (err as { message: string }).message
                : null;
            showToast(detail ?? t('budget.revertMonthError', { month: normalizedMonthLabel }));
          });
      },
    );
  }

  const segmentColors: Record<MonthlyPreviewSegmentKey, string> = {
    expenses: colors.primary,
    savings: colors.success,
    investments: colors.warning,
    remaining: colors.border,
    overBudget: colors.destructive,
  };
  const segmentLabels: Record<MonthlyPreviewSegmentKey, string> = {
    expenses: t('budget.segmentExpenses'),
    savings: t('budget.segmentSavings'),
    investments: t('budget.segmentInvestments'),
    remaining: t('budget.remainingLabel'),
    overBudget: t('budget.overBudgetLabel'),
  };
  const visibleSegments = SEGMENT_ORDER.map((key) => viewModel.segments.find((segment) => segment.key === key)).filter(
    (segment): segment is (typeof viewModel.segments)[number] => !!segment && segment.amount > 0.004,
  );
  const percentOfIncome = (amount: number) => (viewModel.totalIncome > 0 ? Math.round((amount / viewModel.totalIncome) * 100) : 0);

  const [expandedBreakdown, setExpandedBreakdown] = useState<Record<'expenses' | 'savings' | 'investments', boolean>>({
    expenses: false,
    savings: false,
    investments: false,
  });
  function toggleBreakdownExpanded(key: 'expenses' | 'savings' | 'investments') {
    setExpandedBreakdown((current) => ({ ...current, [key]: !current[key] }));
  }

  const remainingIsActionable = !viewModel.isOverAllocated && viewModel.remaining > 0.004;

  const comparisonRows = viewModel.comparedWithLastMonth
    ? [
        { key: 'income', label: t('budget.totalIncomeLabel'), delta: viewModel.comparedWithLastMonth.income, goodWhenUp: true },
        { key: 'expenses', label: t('budget.segmentExpenses'), delta: viewModel.comparedWithLastMonth.expenses, goodWhenUp: false },
        { key: 'savings', label: t('budget.segmentSavings'), delta: viewModel.comparedWithLastMonth.savings, goodWhenUp: true },
        { key: 'investments', label: t('budget.segmentInvestments'), delta: viewModel.comparedWithLastMonth.investments, goodWhenUp: true },
        { key: 'remaining', label: t('budget.remainingLabel'), delta: viewModel.comparedWithLastMonth.remaining, goodWhenUp: true },
      ]
    : [];

  function formatSignedCurrency(amount: number) {
    const rounded = Math.round(amount * 100) / 100;
    const sign = rounded > 0.004 ? '+' : rounded < -0.004 ? '-' : '';
    return `${sign}${displayCurrency(formatCurrency(Math.abs(rounded)), hideValues)}`;
  }
  function deltaColor(delta: number, goodWhenUp: boolean) {
    if (Math.abs(delta) < 0.005) return colors.textSecondary;
    const isUp = delta > 0;
    const isGood = isUp === goodWhenUp;
    return isGood ? colors.success : colors.destructive;
  }

  return (
    <Page
      title={t('budget.title')}
      subtitle={t('budget.subtitle')}
      scrollViewProps={{ ref: scrollRef }}
      overlay={
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: spacing(4),
            paddingTop: spacing(2.5),
            paddingBottom: spacing(3) + insets.bottom,
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
            <View style={{ flexGrow: 1, minWidth: 140 } as any}>
              <Button label={t('budget.editBudget')} variant="secondary" onPress={scrollToEditableSections} />
            </View>
            <View style={{ flexGrow: 2, minWidth: 200 } as any}>
              {isMonthLocked ? (
                <Button
                  label={revertMonth.isPending ? t('budget.reverting') : t('budget.revertMonth')}
                  variant="danger"
                  onPress={handleRevertMonth}
                  disabled={revertMonth.isPending}
                />
              ) : (
                <Button
                  label={confirmMonth.isPending ? t('budget.confirming') : t('budget.confirmMonth')}
                  onPress={() => void handleConfirmMonth()}
                  disabled={!confirmReady || confirmMonth.isPending}
                />
              )}
            </View>
          </View>
        </View>
      }
    >
      <Animated.View entering={FadeInDown.delay(0).duration(420)}>
        <Card>
          <Section title={t('budget.resumeTitle')} subtitle={t('budget.resumeSubtitle')}>
            <View style={!responsive.isPhone ? { maxWidth: 280 } : undefined}>
              <MonthPickerField label={t('budget.month')} value={month} onChange={setMonth} placeholder="MM-YYYY" />
            </View>
          </Section>
        </Card>
      </Animated.View>

      <View style={!responsive.isPhone ? { flexDirection: 'row', gap: spacing(3), alignItems: 'flex-start' } : { gap: spacing(3) }}>
        <View style={!responsive.isPhone ? { flex: 1, minWidth: 0 } : undefined}>
      <Animated.View entering={FadeInDown.delay(80).duration(420)}>
        <Card>
          <Section title={t('budget.incomeSources.title')} subtitle={t('budget.incomeSources.subtitle')}>
            <IncomeSourcesSection
              month={normalizedMonth}
              accounts={accounts}
              members={members}
              categories={incomeCategoriesQuery.data ?? []}
              householdId={householdId ?? ''}
              createdBy={profile?.id ?? ''}
              // Planned items are recurring templates, not month-scoped rules --
              // editing/creating one never touches an already-confirmed occurrence
              // (those are frozen regardless, per the occurrence refresh rule), so
              // there is nothing to lock here just because the *viewed* month is
              // committed. Only occurrence-level actions for THIS month (confirm,
              // revert) are month-lock gated -- see isMonthLocked's other uses below.
            />
          </Section>
        </Card>
      </Animated.View>
        </View>

        <View style={!responsive.isPhone ? { flex: 1, minWidth: 0 } : undefined}>
      <Animated.View entering={FadeInDown.delay(160).duration(420)}>
        <Card>
          <Section title={t('budget.plannedItems.outflowTitle')} subtitle={t('budget.plannedItems.outflowSubtitle')}>
            <PlannedItemsSection
              direction="outflow"
              month={normalizedMonth}
              accounts={accounts}
              members={members}
              categories={allocationCategoriesQuery.data ?? []}
              householdId={householdId ?? ''}
              createdBy={profile?.id ?? ''}
            />
          </Section>
        </Card>
      </Animated.View>
        </View>
      </View>

      <Animated.View entering={FadeInDown.delay(240).duration(420)}>
        <Card>
          <Section title={`${t('budget.previewTitle')} — ${normalizedMonthLabel}`} subtitle={t('budget.previewSubtitle')}>
            {/* ---- Hero: total income, one segmented allocation bar, allocated/remaining ---- */}
            <View style={{ gap: spacing(2) } as any}>
              <View style={!responsive.isPhone ? { flexDirection: 'row', gap: spacing(3), alignItems: 'flex-start', justifyContent: 'space-between' } : { gap: spacing(2) }}>
                <View style={{ gap: spacing(0.5) } as any}>
                  <Text style={{ color: colors.text, fontSize: typography.fontSize[32], fontWeight: String(typography.fontWeight.black) } as any}>
                    {displayCurrency(formatCurrency(viewModel.totalIncome), hideValues)}
                  </Text>
                  <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10], fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.extraBold) } as any}>
                    {t('budget.totalIncomeLabel')}
                  </Text>
                </View>

                {comparisonRows.length > 0 ? (
                  <View style={!responsive.isPhone ? { flex: 1, minWidth: 0, gap: spacing(1.5) } : { gap: spacing(1.5) }}>
                    <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{t('budget.comparedWithLastMonthTitle')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                      {comparisonRows.map((row) => (
                        <View key={row.key} style={{ flexGrow: 1, minWidth: 120, gap: spacing(0.5), padding: spacing(2.5), borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border } as any}>
                          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{row.label}</Text>
                          <Text style={{ color: deltaColor(row.delta, row.goodWhenUp), fontWeight: String(typography.fontWeight.extraBold) } as any}>{formatSignedCurrency(row.delta)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={{ height: spacing(3), borderRadius: radius.full, overflow: 'hidden', backgroundColor: colors.surfaceMuted, flexDirection: 'row' } as any}>
                {visibleSegments.map((segment) => (
                  <View key={segment.key} style={{ flex: Math.max(segment.percent, 0.5), backgroundColor: segmentColors[segment.key] } as any} />
                ))}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) } as any}>
                <Text style={{ color: colors.text, fontSize: typography.fontSize[14] } as any}>
                  {t('budget.allocatedSummary', {
                    amount: displayCurrency(formatCurrency(viewModel.allocated), hideValues),
                    percent: percentOfIncome(viewModel.allocated),
                  })}
                </Text>
                <Text style={{ color: viewModel.isOverAllocated ? colors.destructive : colors.textSecondary, fontSize: typography.fontSize[14], fontWeight: String(typography.fontWeight.bold) } as any}>
                  {t('budget.remainingSummary', { amount: displayCurrency(formatCurrency(viewModel.remaining), hideValues) })}
                </Text>
              </View>

              {viewModel.isOverAllocated ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1.5), padding: spacing(3), borderRadius: radius.lg, backgroundColor: colors.destructiveSoft } as any}>
                  <Ionicons name="warning-outline" size={16} color={colors.destructive} style={{ marginTop: spacing(0.25) } as any} />
                  <Text style={{ flex: 1, color: colors.destructive, fontSize: typography.fontSize[13] } as any}>
                    {t('budget.overBudgetWarning', { amount: displayCurrency(formatCurrency(viewModel.overAllocatedBy), hideValues) })}
                  </Text>
                </View>
              ) : remainingIsActionable ? (
                <View style={{ gap: spacing(1.5), padding: spacing(3), borderRadius: radius.lg, backgroundColor: colors.warningSoft } as any}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1.5) } as any}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.warning} style={{ marginTop: spacing(0.25) } as any} />
                    <Text style={{ flex: 1, color: colors.text, fontSize: typography.fontSize[13] } as any}>
                      {t('budget.remainingUnallocatedTitle', { amount: displayCurrency(formatCurrency(viewModel.remaining), hideValues) })}
                      {'\n'}
                      <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{t('budget.remainingUnallocatedHint')}</Text>
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                    <View style={{ paddingHorizontal: spacing(2.5), paddingVertical: spacing(1.25), borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border } as any}>
                      <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.bold) } as any}>{t('budget.keepAvailable')}</Text>
                    </View>
                    <Pressable
                      onPress={scrollToEditableSections}
                      accessibilityRole="button"
                      style={({ pressed }) => [{ paddingHorizontal: spacing(2.5), paddingVertical: spacing(1.25), borderRadius: radius.full, backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                    >
                      <Text style={{ color: colors.primaryForeground, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.bold) } as any}>{t('budget.addAllocation')}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>

            <View
              style={
                !responsive.isPhone && accountImpactGroups.length > 0
                  ? { flexDirection: 'row', gap: spacing(3), alignItems: 'flex-start' }
                  : { gap: spacing(4) }
              }
            >
              <View style={!responsive.isPhone && accountImpactGroups.length > 0 ? { flex: 1, minWidth: 0 } : undefined}>
            {/* ---- Allocation Breakdown ---- */}
            <View style={{ gap: spacing(2) } as any}>
              <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{t('budget.allocationBreakdownTitle')}</Text>
              <View style={{ gap: spacing(1.5) } as any}>
                {(['expenses', 'savings', 'investments'] as const).map((key) => {
                  const amount = viewModel.allocations[key];
                  const groups =
                    key === 'expenses'
                      ? viewModel.breakdown.expenses.map((group) => ({
                          rowKey: group.categoryId ?? '__uncategorized__',
                          label: group.categoryId ? categoryNameMap.get(group.categoryId) ?? t('budget.noCategoryLabel') : t('budget.noCategoryLabel'),
                          amount: group.amount,
                        }))
                      : viewModel.breakdown[key].map((group) => ({
                          rowKey: group.accountId,
                          label: accountNameMap.get(group.accountId) ?? t('budget.selectDestinationAccount'),
                          amount: group.amount,
                        }));
                  const isExpanded = expandedBreakdown[key];
                  const canExpand = groups.length > 0;
                  return (
                    <View key={key} style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, overflow: 'hidden' } as any}>
                      <Pressable
                        disabled={!canExpand}
                        onPress={() => toggleBreakdownExpanded(key)}
                        accessibilityRole={canExpand ? 'button' : undefined}
                        accessibilityState={canExpand ? { expanded: isExpanded } : undefined}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(3), padding: spacing(3) }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                          <View style={{ width: spacing(2), height: spacing(2), borderRadius: radius.full, backgroundColor: segmentColors[key] } as any} />
                          <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{segmentLabels[key]}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{percentOfIncome(amount)}%</Text>
                          <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.extraBold) } as any}>{displayCurrency(formatCurrency(amount), hideValues)}</Text>
                          {canExpand ? <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} /> : null}
                        </View>
                      </Pressable>
                      {isExpanded && canExpand ? (
                        <View style={{ gap: spacing(1.5), paddingHorizontal: spacing(3), paddingBottom: spacing(3) } as any}>
                          {groups.map((group) => (
                            <View key={group.rowKey} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2), paddingLeft: spacing(3.5) } as any}>
                              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any} numberOfLines={1}>
                                {group.label}
                              </Text>
                              <Text style={{ color: colors.text, fontSize: typography.fontSize[13], fontWeight: String(typography.fontWeight.semibold) } as any}>
                                {displayCurrency(formatCurrency(group.amount), hideValues)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                {/* Remaining -- nothing to expand into, so no chevron/press target. */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(3), padding: spacing(3), borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border } as any}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                    <View style={{ width: spacing(2), height: spacing(2), borderRadius: radius.full, backgroundColor: viewModel.isOverAllocated ? segmentColors.overBudget : segmentColors.remaining, borderWidth: 1, borderColor: colors.border } as any} />
                    <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>
                      {viewModel.isOverAllocated ? t('budget.overBudgetLabel') : t('budget.remainingLabel')}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
                      {viewModel.isOverAllocated ? '' : `${percentOfIncome(viewModel.remaining)}%`}
                    </Text>
                    <Text style={{ color: viewModel.isOverAllocated ? colors.destructive : colors.text, fontWeight: String(typography.fontWeight.extraBold) } as any}>
                      {displayCurrency(formatCurrency(viewModel.isOverAllocated ? viewModel.overAllocatedBy : viewModel.remaining), hideValues)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ---- Transfers execution checklist ---- */}
            {transferEntries.length > 0 ? (
              <Section
                title={t('budget.transfersTitle')}
                subtitle={t('budget.transfersRequiredAndProgress', {
                  count: transferEntries.length,
                  done: transferEntries.filter((entry) => doneTransferKeys.includes(entry.key)).length,
                })}
                collapsible
                defaultCollapsed
              >
                <View style={{ gap: spacing(3) } as any}>
                  {groupedTransferEntries.map((group) => {
                    const groupDone = group.entries.filter((entry) => doneTransferKeys.includes(entry.key)).length;
                    return (
                      <View key={group.ownerMemberId ?? '__shared__'} style={{ borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: spacing(3) } as any}>
                        <Section
                          title={group.label}
                          subtitle={t('budget.transferGroupSummary', { count: group.entries.length, done: groupDone })}
                          collapsible
                          defaultCollapsed
                        >
                          <View style={{ gap: spacing(2) } as any}>
                            {group.entries.map((entry) => {
                              const isDone = doneTransferKeys.includes(entry.key);
                              const sourceLabel = entry.sourceAccountId
                                ? accountNameMap.get(entry.sourceAccountId) ?? t('budget.selectSourceAccount')
                                : t('budget.transferSourceIncome');
                              const destinationLabel = accountNameMap.get(entry.destinationAccountId) ?? t('budget.selectDestinationAccount');
                              return (
                                <Pressable
                                  key={entry.key}
                                  onPress={() => toggleTransferDone(entry.key)}
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
                                  <Ionicons name={isDone ? 'checkbox' : 'square-outline'} size={20} color={isDone ? colors.success : colors.textSecondary} style={{ marginTop: spacing(0.5) } as any} />
                                  <View style={{ flex: 1, gap: spacing(0.5) } as any}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                                      <Ionicons name="swap-horizontal-outline" size={16} color={colors.textSecondary} />
                                      <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold), textDecorationLine: isDone ? 'line-through' : 'none', opacity: isDone ? 0.7 : 1 } as any}>
                                        {entry.title}
                                      </Text>
                                      {isDone ? (
                                        <View style={{ paddingHorizontal: spacing(2), paddingVertical: spacing(0.5), borderRadius: radius.full, backgroundColor: colors.success } as any}>
                                          <Text style={{ color: colors.primaryForeground, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.extraBold) } as any}>{t('budget.transferDone')}</Text>
                                        </View>
                                      ) : null}
                                    </View>
                                    <Text style={{ color: colors.textSecondary, opacity: isDone ? 0.7 : 1 } as any}>
                                      {sourceLabel} → {destinationLabel} · {displayCurrency(formatCurrency(entry.amount), hideValues)}
                                    </Text>
                                  </View>
                                </Pressable>
                              );
                            })}
                          </View>
                        </Section>
                      </View>
                    );
                  })}
                </View>
              </Section>
            ) : null}
              </View>

            {accountImpactGroups.length > 0 ? (
              <View style={!responsive.isPhone ? { flex: 1, minWidth: 0 } : undefined}>
              {/* ---- Account Impact ---- */}
              <View style={{ gap: spacing(2) } as any}>
                <View style={{ gap: spacing(0.5) } as any}>
                  <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{t('budget.accountImpactTitle')}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>{t('budget.accountImpactSubtitle')}</Text>
                </View>
                <View style={{ gap: spacing(4) } as any}>
                  {accountImpactGroups.map((group) => (
                    <View key={group.ownerProfileId ?? '__shared__'} style={{ gap: spacing(2) } as any}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                        <Ionicons name={group.ownerProfileId ? 'person-circle-outline' : 'people-outline'} size={16} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.bold), fontSize: typography.fontSize[13] } as any}>{group.label}</Text>
                      </View>
                      <View style={{ gap: spacing(3) } as any}>
                        {groupImpactsByType(group.impacts).map((typeGroup) => (
                          <View key={typeGroup.typeLabel ?? '__flat__'} style={{ gap: spacing(1.5) } as any}>
                            {typeGroup.typeLabel ? (
                              <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[11], fontWeight: String(typography.fontWeight.extraBold), letterSpacing: typography.letterSpacing[10] } as any}>
                                {typeGroup.typeLabel}
                              </Text>
                            ) : null}
                            {typeGroup.impacts.map((impact) => (
                              <View
                                key={impact.accountId}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(3), padding: spacing(3), borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border } as any}
                              >
                                <Text style={{ flex: 1, color: colors.text, fontWeight: String(typography.fontWeight.semibold) } as any} numberOfLines={1}>
                                  {accountNameMap.get(impact.accountId) ?? t('budget.selectDestinationAccount')}
                                </Text>
                                <View style={{ alignItems: 'flex-end', gap: spacing(0.5) } as any}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) } as any}>
                                    <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{displayCurrency(formatCurrency(impact.before), hideValues)}</Text>
                                    <Ionicons name="arrow-forward-outline" size={12} color={colors.textSecondary} />
                                    <Text style={{ color: colors.text, fontSize: typography.fontSize[13], fontWeight: String(typography.fontWeight.extraBold) } as any}>{displayCurrency(formatCurrency(impact.after), hideValues)}</Text>
                                  </View>
                                  <Text style={{ color: impact.change >= 0 ? colors.success : colors.destructive, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.bold) } as any}>
                                    {formatSignedCurrency(impact.change)}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              </View>
            ) : null}
            </View>

            {validationIssues.length > 0 ? (
              <View style={{ gap: spacing(2) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                  <Ionicons name="warning-outline" size={16} color={colors.destructive} />
                  <Text style={{ color: colors.destructive, fontWeight: String(typography.fontWeight.extraBold) } as any}>{t('budget.validationTitle')}</Text>
                </View>
                {validationIssues.map((issue, index) => (
                  <Text key={`${index}-${issue}`} style={{ color: colors.destructive }}>{issue}</Text>
                ))}
              </View>
            ) : null}
          </Section>
        </Card>
      </Animated.View>

      {/* Keeps the last card clear of the fixed bottom action bar above.
          Grows with the bottom safe-area inset since the bar's own
          padding (and therefore its rendered height) grows with it too. */}
      <View style={{ height: spacing(26) + insets.bottom } as any} />
    </Page>
  );
}
