import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Badge, TableRow, TableCell } from '@/components/data-surface';
import { Field, Pill, Button, formatCurrency } from '@/components/migrated-page';
import { GroupedAccountSelect } from '@/components/grouped-account-select';
import { CategoryPicker, type CategoryPickerCategory } from '@/components/category-picker';
import { MonthPickerField } from '@/components/date-picker-field';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';
import { MONTH_OPTIONS, getMemberLabel } from '@/features/monthly-budget/ui-utils';
import type { BudgetAccountLike, BudgetMemberLike } from '@/features/monthly-budget/types';

import type { PlannedItemDirection, PlannedItemDraft, PlannedItemOccurrence } from '../types';
import { formatPlannedItemRecurrenceSummary, generateDestinationDraftId } from '../utils';
import { PlannedItemDestinationsEditor } from './planned-item-destinations-editor';
import { PlannedItemOccurrenceMatchPicker } from './occurrence-match-picker';

export type PlannedItemMatchedTransactionInfo = {
  title: string;
  amount: number;
  transaction_date: string;
};

type PlannedItemCardProps = {
  draft: PlannedItemDraft;
  isNew: boolean;
  isCollapsed: boolean;
  isSaving?: boolean;
  /** This month's materialized occurrence for this item, if it's due -- null when the item doesn't apply to the month currently shown. */
  occurrence: PlannedItemOccurrence | null;
  matchedTransaction: PlannedItemMatchedTransactionInfo | null;
  /** "YYYY-MM" -- needed to scope the "link transaction" candidate search to the right month. */
  month: string;
  accounts: BudgetAccountLike[];
  members: BudgetMemberLike[];
  categories: CategoryPickerCategory[];
  accountNameMap: Map<string, string>;
  destinationAccountTypeLabels: Record<string, string>;
  onToggleCollapse: () => void;
  onChange: (patch: Partial<PlannedItemDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onMatchTransaction: (transactionId: string) => void;
  onUnmatchTransaction: () => void;
  matchPickerOpen: boolean;
  onToggleMatchPicker: () => void;
  /** Generic read-only override for callers that need it (e.g. a future archived/shared view). NOT wired to the month lock -- planned items are recurring templates, independent of any one month's confirmed occurrence, so budget.tsx always passes false here. */
  disabled?: boolean;
};

function directionIcon(direction: PlannedItemDirection) {
  return direction === 'inflow' ? 'cash-outline' : 'repeat-outline';
}

export function PlannedItemCard({
  draft,
  isNew,
  isCollapsed,
  isSaving = false,
  occurrence,
  matchedTransaction,
  month,
  accounts,
  members,
  categories,
  accountNameMap,
  destinationAccountTypeLabels,
  onToggleCollapse,
  onChange,
  onSave,
  onCancel,
  onDelete,
  onToggleActive,
  onMatchTransaction,
  onUnmatchTransaction,
  matchPickerOpen,
  onToggleMatchPicker,
  disabled = false,
}: PlannedItemCardProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const money = (value: number | string | null | undefined) => displayCurrency(formatCurrency(value), hideValues);
  const isInflow = draft.direction === 'inflow';

  const nameLabel = t(isInflow ? 'budget.incomeSources.name' : 'budget.plannedItems.name');
  const namePlaceholder = t(isInflow ? 'budget.incomeSources.namePlaceholder' : 'budget.plannedItems.namePlaceholder');
  const amountLabel = t(isInflow ? 'budget.incomeSources.amount' : 'budget.plannedItems.amount');
  const categoryLabel = t(isInflow ? 'budget.incomeSources.category' : 'budget.plannedItems.category');
  const categoryPlaceholder = t(isInflow ? 'budget.incomeSources.categoryPlaceholder' : 'budget.plannedItems.categoryPlaceholder');

  const primaryDestinationAccountId = draft.destinations[0]?.destinationAccountId ?? '';
  const destinationSummary = isInflow
    ? (accountNameMap.get(primaryDestinationAccountId) ?? t('budget.incomeSources.selectAccount'))
    : draft.destinations.length === 0
      ? t('budget.plannedItems.noDestinationsHint')
      : draft.destinations.length === 1
        ? (accountNameMap.get(primaryDestinationAccountId) ?? t('budget.selectDestinationAccount'))
        : t('budget.destinationAccountsCount', { count: draft.destinations.length });

  const recurrenceSummary = formatPlannedItemRecurrenceSummary(draft);
  const toggleMonth = (monthValue: number) =>
    onChange({
      recurrenceMonths: draft.recurrenceMonths.includes(monthValue)
        ? draft.recurrenceMonths.filter((entry) => entry !== monthValue)
        : [...draft.recurrenceMonths, monthValue].sort((a, b) => a - b),
    });

  function updateInflowDestinationAccount(accountId: string) {
    const existing = draft.destinations[0];
    onChange({
      allocationMode: 'single',
      destinations: [
        existing
          ? { ...existing, destinationAccountId: accountId }
          : { id: generateDestinationDraftId(), destinationAccountId: accountId, amount: '', percent: '', categoryId: null },
      ],
    });
  }

  const isEstimateOccurrence = !!occurrence && occurrence.isEstimate;
  const isMatched = isEstimateOccurrence && occurrence?.status === 'matched';
  const diffAmount = matchedTransaction ? Math.round((matchedTransaction.amount - (occurrence?.expectedAmount ?? 0)) * 100) / 100 : 0;

  const statusBadge = !draft.isActive ? (
    <Badge label={t('budget.recurringExpenses.paused')} tone="neutral" />
  ) : occurrence ? (
    occurrence.status === 'skipped' ? (
      <Badge label={t('budget.plannedItems.statuses.skipped')} tone="neutral" />
    ) : occurrence.status === 'cancelled' ? (
      <Badge label={t('budget.plannedItems.statuses.cancelled')} tone="neutral" />
    ) : isEstimateOccurrence ? (
      isMatched ? (
        <Badge label={t('budget.recurringExpenses.matched')} tone="success" />
      ) : (
        <Badge label={t('budget.plannedItems.estimatePending')} tone="primary" />
      )
    ) : (
      <Badge label={t('budget.recurringExpenses.dueThisMonth')} tone="primary" />
    )
  ) : null;

  // Collapsed items render as a single compact table row -- see
  // planned-items-section.tsx's <Table> wrapper. Tapping the row expands
  // it into the full editing card below, same convention as every other
  // Monthly Budget list (income sources, recurring expenses, the old
  // budget rules).
  if (!isNew && isCollapsed) {
    return (
      <TableRow onPress={onToggleCollapse}>
        <TableCell flex={2.2}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name={directionIcon(draft.direction)} size={14} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold), flexShrink: 1 } as any} numberOfLines={1}>
              {draft.name || namePlaceholder}
            </Text>
          </View>
        </TableCell>
        <TableCell flex={1.5} muted>
          {isInflow
            ? destinationSummary
            : (accountNameMap.get(draft.sourceAccountId) ?? t('budget.selectSourceAccount'))}
        </TableCell>
        <TableCell flex={1} align="right">
          {money(draft.amount)}
        </TableCell>
        {!isInflow ? (
          <TableCell flex={1.5} muted>
            {destinationSummary}
          </TableCell>
        ) : null}
        <TableCell flex={1.5}>
          <View style={{ gap: spacing(0.5) } as any}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any} numberOfLines={1}>
              {recurrenceSummary}
            </Text>
            {statusBadge}
          </View>
        </TableCell>
        <TableCell flex={0.4} align="right" mobilePinned>
          <Ionicons name="chevron-forward-outline" size={16} color={colors.textSecondary} />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <View
      style={{
        width: '100%',
        gap: spacing(3),
        padding: spacing(3.5),
        marginVertical: isNew ? 0 : spacing(2),
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        opacity: draft.isActive ? 1 : 0.75,
      } as any}
    >
      <Pressable
        onPress={onToggleCollapse}
        accessibilityRole="button"
        accessibilityState={{ expanded: true }}
        accessibilityLabel={draft.name || namePlaceholder}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2), opacity: pressed ? 0.9 : 1 }] as any}
      >
        <View style={{ flex: 1, gap: spacing(1) } as any}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing(2) } as any}>
            <Ionicons name={directionIcon(draft.direction)} size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold } as any}>
              {draft.name || namePlaceholder}
            </Text>
            {statusBadge}
          </View>
          <Text style={{ color: colors.textSecondary } as any}>
            {money(draft.amount)}
            {isInflow ? ` → ${destinationSummary}` : ` · ${accountNameMap.get(draft.sourceAccountId) ?? t('budget.selectSourceAccount')} → ${destinationSummary}`}
            {' · '}
            {recurrenceSummary}
          </Text>
        </View>
        {!isNew ? <Ionicons name="chevron-down-outline" size={18} color={colors.textSecondary} /> : null}
      </Pressable>

      <Fragment>
        <Field label={nameLabel} value={draft.name} onChangeText={(value) => onChange({ name: value })} placeholder={namePlaceholder} editable={!disabled} />
        <Field label={amountLabel} value={draft.amount} onChangeText={(value) => onChange({ amount: value })} keyboardType="numeric" placeholder="0.00" editable={!disabled} />

        {!isInflow ? (
          <GroupedAccountSelect
            label={t('budget.sourceAccount')}
            accounts={accounts}
            members={members}
            value={draft.sourceAccountId}
            placeholder={t('budget.selectSourceAccount')}
            hint={t('budget.plannedItems.sourceAccountHint')}
            allowedTypes={['cash', 'bank']}
            sharedLabel={t('budget.shared')}
            unassignedLabel={t('settings.unnamedUser')}
            closeLabel={t('cancel')}
            onChange={(accountId) => onChange({ sourceAccountId: accountId })}
            disabled={disabled}
          />
        ) : (
          <GroupedAccountSelect
            label={t('budget.plannedItems.depositsInto')}
            accounts={accounts}
            members={members}
            value={primaryDestinationAccountId}
            placeholder={t('budget.incomeSources.selectAccount')}
            hint={t('budget.incomeSources.accountHint')}
            sharedLabel={t('budget.shared')}
            unassignedLabel={t('settings.unnamedUser')}
            closeLabel={t('cancel')}
            onChange={updateInflowDestinationAccount}
            disabled={disabled}
          />
        )}

        <CategoryPicker
          label={categoryLabel}
          placeholder={categoryPlaceholder}
          categories={categories}
          selectedId={draft.categoryId}
          onChange={(categoryId) => onChange({ categoryId: categoryId ?? '' })}
          disabled={disabled}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
          <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.owner')}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
          <Pill label={t('budget.shared')} active={!draft.ownerMemberId} onPress={disabled ? undefined : () => onChange({ ownerMemberId: null })} />
          {members.map((member) => (
            <Pill
              key={member.userId}
              label={getMemberLabel(member, t('budget.shared'))}
              active={draft.ownerMemberId === member.userId}
              onPress={disabled ? undefined : () => onChange({ ownerMemberId: member.userId })}
            />
          ))}
        </View>

        {!isInflow ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
              <Ionicons name="help-circle-outline" size={14} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
                {t('budget.plannedItems.amountType')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
              <Pill
                label={t('budget.plannedItems.fixedAmount')}
                active={!draft.isEstimate}
                onPress={disabled ? undefined : () => onChange({ isEstimate: false })}
              />
              <Pill
                label={t('budget.plannedItems.estimate')}
                active={draft.isEstimate}
                onPress={disabled ? undefined : () => onChange({ isEstimate: true, destinations: draft.destinations.slice(0, 1) })}
              />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
              {t('budget.plannedItems.estimateHint')}
            </Text>
          </>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
            {t('budget.recurringExpenses.recurrence')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
          <Pill label={t('budget.recurringExpenses.recurrenceTypes.monthly')} active={draft.recurrenceType === 'monthly'} onPress={disabled ? undefined : () => onChange({ recurrenceType: 'monthly' })} />
          <Pill label={t('budget.recurringExpenses.recurrenceTypes.specific_months')} active={draft.recurrenceType === 'specific_months'} onPress={disabled ? undefined : () => onChange({ recurrenceType: 'specific_months' })} />
          <Pill label={t('budget.recurringExpenses.recurrenceTypes.interval')} active={draft.recurrenceType === 'interval'} onPress={disabled ? undefined : () => onChange({ recurrenceType: 'interval' })} />
          <Pill label={t('budget.incomeSources.recurrenceTypes.one_time')} active={draft.recurrenceType === 'one_time'} onPress={disabled ? undefined : () => onChange({ recurrenceType: 'one_time' })} />
        </View>

        {draft.recurrenceType === 'specific_months' ? (
          <View style={{ gap: spacing(1.5) } as any}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) }}>
              {MONTH_OPTIONS.map((option) => (
                <Pill key={option.value} label={option.label} active={draft.recurrenceMonths.includes(option.value)} onPress={disabled ? undefined : () => toggleMonth(option.value)} />
              ))}
            </View>
            {draft.recurrenceMonths.length === 0 ? (
              <Text style={{ color: colors.warning, fontSize: typography.fontSize[13] } as any}>{t('budget.recurringExpenses.selectAtLeastOneMonth')}</Text>
            ) : null}
          </View>
        ) : null}

        {draft.recurrenceType === 'interval' ? (
          <Field label={t('budget.recurringExpenses.everyNMonths')} value={draft.recurrenceIntervalMonths} onChangeText={(value) => onChange({ recurrenceIntervalMonths: value })} keyboardType="numeric" placeholder="2" editable={!disabled} />
        ) : null}

        {draft.recurrenceType === 'one_time' ? (
          <MonthPickerField label={t('budget.incomeSources.oneTimeMonth')} value={draft.oneTimeMonth} onChange={(oneTimeMonth) => onChange({ oneTimeMonth })} placeholder="MM-YYYY" disabled={disabled} />
        ) : null}

        {draft.recurrenceType !== 'one_time' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
            <View style={{ flex: 1, minWidth: 160 } as any}>
              <MonthPickerField label={t('budget.plannedItems.startMonth')} value={draft.startMonth} onChange={(startMonth) => onChange({ startMonth })} placeholder="MM-YYYY" disabled={disabled} />
            </View>
            <View style={{ flex: 1, minWidth: 160 } as any}>
              <MonthPickerField label={t('budget.plannedItems.endMonth')} value={draft.endMonth} onChange={(endMonth) => onChange({ endMonth })} placeholder={t('budget.plannedItems.noEndMonth')} disabled={disabled} />
            </View>
          </View>
        ) : null}
        {draft.recurrenceType !== 'one_time' && draft.endMonth ? (
          <Pressable onPress={disabled ? undefined : () => onChange({ endMonth: '' })} hitSlop={8}>
            <Text style={{ color: colors.primary, fontSize: typography.fontSize[13] } as any}>{t('budget.plannedItems.removeEndMonth')}</Text>
          </Pressable>
        ) : null}

        {!isInflow ? (
          <PlannedItemDestinationsEditor
            totalAmount={Number(draft.amount) || 0}
            destinations={draft.destinations}
            allocationMode={draft.allocationMode}
            sourceAccountId={draft.sourceAccountId}
            isEstimate={draft.isEstimate}
            accounts={accounts}
            members={members}
            categories={categories}
            accountNameMap={accountNameMap}
            destinationAccountTypeLabels={destinationAccountTypeLabels}
            onSetDestinations={(destinations, allocationMode) => onChange({ destinations, allocationMode })}
            disabled={disabled}
          />
        ) : null}

        {!isNew && isEstimateOccurrence && occurrence ? (
          <View
            style={{
              gap: spacing(1.5),
              padding: spacing(2.5),
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceMuted,
            } as any}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
              {t('budget.plannedItems.thisMonth')}
            </Text>
            {isMatched && matchedTransaction ? (
              <View style={{ gap: spacing(1) } as any}>
                <Text style={{ color: colors.success } as any}>
                  {t('budget.plannedItems.expectedVsActual', {
                    expected: money(occurrence.expectedAmount),
                    actual: money(matchedTransaction.amount),
                    diff: `${diffAmount >= 0 ? '+' : ''}${money(diffAmount)}`,
                  })}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) } as any}>
                  <Text style={{ flex: 1, color: colors.textSecondary } as any} numberOfLines={1}>
                    {t('budget.plannedItems.matchedTo', { title: matchedTransaction.title })}
                  </Text>
                  <Pressable onPress={onUnmatchTransaction} hitSlop={8}>
                    <Text style={{ color: colors.destructive, fontSize: typography.fontSize[13] } as any}>{t('budget.plannedItems.unlink')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) } as any}>
                <Text style={{ flex: 1, color: colors.textSecondary } as any}>{t('budget.plannedItems.notYetMatched')}</Text>
                <Button label={t('budget.plannedItems.linkTransaction')} onPress={onToggleMatchPicker} variant="secondary" />
              </View>
            )}
            {matchPickerOpen ? (
              <PlannedItemOccurrenceMatchPicker
                accountId={draft.direction === 'outflow' ? draft.sourceAccountId : primaryDestinationAccountId}
                month={month}
                direction={draft.direction}
                onClose={onToggleMatchPicker}
                onSelect={(transactionId) => onMatchTransaction(transactionId)}
              />
            ) : null}
          </View>
        ) : null}
      </Fragment>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), justifyContent: 'space-between' } as any}>
        {isNew ? (
          <View style={{ flexDirection: 'row', gap: spacing(2) } as any}>
            <Button label={isSaving ? t('saving') : t('budget.plannedItems.save')} onPress={onSave} disabled={isSaving || disabled} />
            <Button label={t('cancel')} onPress={onCancel} variant="secondary" />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
            <Button label={isSaving ? t('saving') : t('budget.plannedItems.save')} onPress={onSave} disabled={isSaving || disabled} />
            <Pill
              label={draft.isActive ? t('budget.recurringExpenses.pause') : t('budget.recurringExpenses.resume')}
              active={!draft.isActive}
              onPress={disabled ? undefined : onToggleActive}
            />
            <Button label={t('delete')} onPress={onDelete} variant="danger" disabled={disabled} />
          </View>
        )}
      </View>
    </View>
  );
}
