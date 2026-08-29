import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Page, Card, Section, Button, formatCurrency } from '@/components/migrated-page';
import { MonthPickerField } from '@/components/date-picker-field';
import { useTheme } from '@/theme/ThemeProvider';
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

// A thin, animated fill bar used for the hero allocation meter and the
// preview section's breakdown bars -- width eases in with a spring-like
// timing curve instead of snapping instantly whenever the underlying
// numbers change, which reads as a much more considered, "alive" surface.
// Unchanged from the pre-cutover screen.
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
 *    remaining action is "Confirm month", which turns the household's
 *    MonthlyBudgetPeriod for that month into 'committed' and posts the
 *    real transactions (useConfirmPlannedItemMonth).
 *  - Month-lock now reads MonthlyBudgetPeriod.status ('committed' or
 *    'closed') via useMonthlyBudgetPeriod instead of the old
 *    monthly_budget_runs.status === 'confirmed'.
 *  - The "Previsão mensal" section's numbers are now
 *    ResolvedMonth.summary (income / plannedExpenses / estimatedExpenses /
 *    savings / investments / available) instead of the old
 *    MonthlyBudgetPreview. Its Tendência trend chart has no direct
 *    replacement for the old run.preview_snapshot.remainingCash (that
 *    column lived on monthly_budget_runs, which this rebuild retires) --
 *    see useRecentPlannedMonthsSummary's own doc comment for the small
 *    new aggregation this reads instead.
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
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  // This screen's `overlay` is a fixed bottom action bar (see below), not
  // scroll content, so it needs its own bottom-inset padding or the
  // confirm button sits under the Android system nav bar / iOS home
  // indicator.
  const insets = useSafeAreaInsets();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const { householdId, profile } = useAuth();
  const { show: showToast } = useToast();

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
  const resolved = previewQuery.data ?? null;
  const summary = resolved?.summary ?? { income: 0, plannedExpenses: 0, estimatedExpenses: 0, savings: 0, investments: 0, available: 0 };
  const itemsQuery = usePlannedItems();
  const items = itemsQuery.data ?? [];
  const itemNameById = useMemo(() => new Map(items.map((item) => [item.id, item.name])), [items]);

  const confirmMonth = useConfirmPlannedItemMonth();
  const revertMonth = useRevertMonthlyBudgetMonth();
  const trendQuery = useRecentPlannedMonthsSummary(6);
  const trendEntries = trendQuery.data ?? [];

  const accountNameMap = useMemo(() => new Map(accounts.map((account) => [account.id, account.name])), [accounts]);
  const accountOwnerLabelMap = useMemo(
    () =>
      new Map(
        accounts.map((account) => [
          account.id,
          account.owner_profile_id
            ? getMemberLabel(members.find((member) => member.userId === account.owner_profile_id), t('budget.shared'))
            : t('budget.shared'),
        ]),
      ),
    [accounts, members, t],
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
    const entries: Array<{ key: string; title: string; amount: number; destinationAccountId: string; categoryId: string | null }> = [];
    for (const item of resolved?.occurrences ?? []) {
      if (!item.isValid) continue;
      for (const destination of item.destinations) {
        entries.push({
          key: getTransferKey({ plannedItemId: item.occurrence.plannedItemId, destinationAccountId: destination.destinationAccountId }),
          title: itemNameById.get(item.occurrence.plannedItemId) ?? '',
          amount: destination.amount,
          destinationAccountId: destination.destinationAccountId,
          categoryId: destination.categoryId,
        });
      }
    }
    return entries;
  }, [resolved, itemNameById]);

  const budgetIsOnTrack = summary.available >= 0;
  const budgetStatusLabel = budgetIsOnTrack ? t('budget.onTrack') : t('budget.overBudget');
  const budgetStatusColor = budgetIsOnTrack ? colors.success : colors.destructive;
  const totalPlanned = Math.round((summary.plannedExpenses + summary.estimatedExpenses) * 100) / 100;
  const allocationPercentRaw = summary.income > 0 ? Math.round((totalPlanned / summary.income) * 100) : 0;
  const allocationPercent = Math.min(100, allocationPercentRaw);

  const keyPreviewStats = useMemo(
    () => [
      {
        label: t('budget.estimatedExpensesLabel'),
        value: displayCurrency(formatCurrency(summary.estimatedExpenses), hideValues),
        icon: 'help-circle-outline' as const,
        color: colors.text,
      },
      {
        label: t('budget.available'),
        value: displayCurrency(formatCurrency(summary.available), hideValues),
        icon: summary.available >= 0 ? ('trending-up-outline' as const) : ('trending-down-outline' as const),
        color: budgetStatusColor,
      },
      {
        label: t('budget.savingsBucketLabel'),
        value: displayCurrency(formatCurrency(summary.savings + summary.investments), hideValues),
        icon: 'shield-checkmark-outline' as const,
        color: colors.text,
      },
    ],
    [budgetStatusColor, colors.text, hideValues, summary.available, summary.estimatedExpenses, summary.investments, summary.savings, t],
  );

  const breakdownRows = useMemo(
    () => [
      { key: 'plannedExpenses', label: t('budget.plannedExpensesLabel'), amount: summary.plannedExpenses, icon: 'card-outline' as const },
      { key: 'estimatedExpenses', label: t('budget.estimatedExpensesLabel'), amount: summary.estimatedExpenses, icon: 'help-circle-outline' as const },
      { key: 'savings', label: t('budget.savingsBucketLabel'), amount: summary.savings, icon: 'shield-checkmark-outline' as const },
      { key: 'investments', label: t('budget.investmentsBucketLabel'), amount: summary.investments, icon: 'trending-up-outline' as const },
    ],
    [summary, t],
  );

  const validationIssues = useMemo(
    () => (resolved?.occurrences ?? []).filter((item) => !item.isValid).flatMap((item) => item.validationIssues),
    [resolved],
  );

  const trendMaxAbsRemaining = Math.max(1, ...trendEntries.map((entry) => Math.abs(entry.remainingCash)));
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
    Alert.alert(
      t('budget.revertMonthTitle'),
      t('budget.revertMonthMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('budget.revertMonthConfirm'),
          style: 'destructive',
          onPress: () => {
            void revertMonth
              .mutateAsync(normalizedMonth)
              .then(() => showToast(t('budget.revertMonthSuccess')))
              .catch(() => showToast(t('budget.revertMonthError')));
          },
        },
      ],
    );
  }

  return (
    <Page
      title={t('budget.title')}
      subtitle={t('budget.subtitle')}
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
      }
    >
      <Animated.View entering={FadeInDown.delay(0).duration(420)}>
        <Card>
          <Section title={t('budget.resumeTitle')} subtitle={t('budget.resumeSubtitle')}>
            <View style={{ gap: spacing(2) } as any}>
              <MonthPickerField label={t('budget.month')} value={month} onChange={setMonth} placeholder="MM-YYYY" />
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
                      <Text style={{ color: colors.text, fontSize: typography.fontSize[48], lineHeight: typography.lineHeight[52], fontWeight: String(typography.fontWeight.black), letterSpacing: -0.5 } as any}>
                        {displayCurrency(formatCurrency(summary.income), hideValues)}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: spacing(2.5), paddingVertical: spacing(1.25), borderRadius: radius.full, backgroundColor: budgetIsOnTrack ? colors.successSoft : colors.destructiveSoft } as any}>
                      <Text style={{ color: budgetStatusColor, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.extraBold) } as any}>{budgetStatusLabel}</Text>
                    </View>
                  </View>
                  <AnimatedProgressBar percent={allocationPercent} color={budgetIsOnTrack ? colors.success : colors.destructive} trackColor={colors.muted} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                    <View style={{ flexGrow: 1, minWidth: 150, gap: spacing(0.5), padding: spacing(2.5), borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border } as any}>
                      <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.plannedExpensesLabel')}</Text>
                      <Text style={{ color: colors.primary, fontSize: typography.fontSize[18], fontWeight: String(typography.fontWeight.extraBold) } as any}>{displayCurrency(formatCurrency(totalPlanned), hideValues)}</Text>
                    </View>
                    <View style={{ flexGrow: 1, minWidth: 150, gap: spacing(0.5), padding: spacing(2.5), borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border } as any}>
                      <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.available')}</Text>
                      <Text style={{ color: budgetIsOnTrack ? colors.success : colors.destructive, fontSize: typography.fontSize[18], fontWeight: String(typography.fontWeight.extraBold) } as any}>{displayCurrency(formatCurrency(summary.available), hideValues)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </Section>
        </Card>
      </Animated.View>

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

      <Animated.View entering={FadeInDown.delay(240).duration(420)}>
        <Card>
          <Section title={t('budget.previewTitle')} subtitle={t('budget.previewSubtitle')}>
            <View style={{ gap: spacing(1.5) } as any}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing(2) } as any}>
                <View style={{ gap: spacing(0.5) } as any}>
                  <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10], fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.extraBold) } as any}>
                    {t('budget.incomeTotal')}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: typography.fontSize[32], fontWeight: String(typography.fontWeight.black) } as any}>
                    {displayCurrency(formatCurrency(summary.income), hideValues)}
                  </Text>
                </View>
                <View style={{ paddingHorizontal: spacing(2.5), paddingVertical: spacing(1.25), borderRadius: radius.full, backgroundColor: budgetIsOnTrack ? colors.successSoft : colors.destructiveSoft } as any}>
                  <Text style={{ color: budgetStatusColor, fontWeight: String(typography.fontWeight.extraBold), fontSize: typography.fontSize[13] } as any}>{budgetStatusLabel}</Text>
                </View>
              </View>
              <AnimatedProgressBar percent={allocationPercent} color={budgetStatusColor} trackColor={colors.surfaceMuted} height={spacing(2.5)} />
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
                {t('budget.allocatedOfIncome', { percent: allocationPercentRaw, amount: displayCurrency(formatCurrency(totalPlanned), hideValues) })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
              {keyPreviewStats.map((stat) => (
                <View key={stat.label} style={{ flex: 1, minWidth: 160 } as any}>
                  <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                      <Ionicons name={stat.icon} size={16} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', fontSize: typography.fontSize[12] } as any}>{stat.label}</Text>
                    </View>
                    <Text style={{ color: stat.color, fontSize: typography.fontSize[24], fontWeight: String(typography.fontWeight.extraBold) } as any}>{stat.value}</Text>
                  </Card>
                </View>
              ))}
            </View>

            <View style={{ gap: spacing(2.5) }}>
              {breakdownRows.map((row) => {
                const percent = summary.income > 0 ? Math.min(100, Math.round((row.amount / summary.income) * 100)) : 0;
                return (
                  <View key={row.key} style={{ gap: spacing(1.5), padding: spacing(3), borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border } as any}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(3) } as any}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                        <Ionicons name={row.icon} size={16} color={colors.textSecondary} />
                        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{row.label}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing(1.5) } as any}>
                        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{percent}%</Text>
                        <Text style={{ color: colors.primary, fontWeight: String(typography.fontWeight.extraBold) } as any}>{displayCurrency(formatCurrency(row.amount), hideValues)}</Text>
                      </View>
                    </View>
                    <AnimatedProgressBar percent={percent} color={colors.primary} trackColor={colors.surface} height={spacing(1.25)} />
                  </View>
                );
              })}
            </View>

            <View style={{ gap: spacing(2) } as any}>
              <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{t('budget.trendTitle')}</Text>
              {trendEntries.length > 1 ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing(2), height: spacing(22) } as any}>
                  {trendEntries.map((entry) => {
                    const barPercent = Math.max(4, Math.round((Math.abs(entry.remainingCash) / trendMaxAbsRemaining) * 100));
                    const isCurrent = entry.month === normalizedMonth;
                    return (
                      <View key={entry.month} style={{ flex: 1, alignItems: 'center', gap: spacing(1), height: '100%' } as any}>
                        <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' } as any}>
                          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any} numberOfLines={1}>
                            {displayCurrency(formatCurrency(entry.remainingCash), hideValues)}
                          </Text>
                          <View
                            style={{
                              width: '60%',
                              minHeight: spacing(0.5),
                              marginTop: spacing(0.5),
                              borderRadius: radius.sm,
                              height: `${barPercent}%`,
                              backgroundColor: entry.remainingCash >= 0 ? colors.success : colors.destructive,
                              opacity: isCurrent ? 1 : 0.6,
                            } as any}
                          />
                        </View>
                        <Text style={{ color: isCurrent ? colors.text : colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: isCurrent ? String(typography.fontWeight.bold) : undefined } as any} numberOfLines={1}>
                          {entry.month}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>{t('budget.trendEmpty')}</Text>
              )}
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

            {transferEntries.length > 0 ? (
              <Section
                title={t('budget.transfersTitle')}
                subtitle={t('budget.transfersProgress', {
                  done: transferEntries.filter((entry) => doneTransferKeys.includes(entry.key)).length,
                  count: transferEntries.length,
                })}
                collapsible
                defaultCollapsed={transferEntries.length > 6}
              >
                <View style={{ gap: spacing(2) }}>
                  {transferEntries.map((entry) => {
                    const isDone = doneTransferKeys.includes(entry.key);
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
                            {displayCurrency(formatCurrency(entry.amount), hideValues)} · {`${t('budget.destinationAccount')}: ${accountNameMap.get(entry.destinationAccountId) ?? t('budget.selectDestinationAccount')}`}
                            {' · '}
                            {t('budget.destinationAccountOwner', { name: accountOwnerLabelMap.get(entry.destinationAccountId) ?? t('budget.shared') })}
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

      {/* Keeps the last card clear of the fixed bottom action bar above.
          Grows with the bottom safe-area inset since the bar's own
          padding (and therefore its rendered height) grows with it too. */}
      <View style={{ height: spacing(26) + insets.bottom } as any} />
    </Page>
  );
}
