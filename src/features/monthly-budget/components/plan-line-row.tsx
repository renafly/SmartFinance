import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { GroupedAccountSelect } from '@/components/grouped-account-select';
import { CategoryPicker, type CategoryPickerCategory } from '@/components/category-picker';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsiveMetrics } from '@/theme/responsive';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { formatPlannedItemRecurrenceSummary } from '@/features/planned-items/utils';
import type { PlannedItemDraft } from '@/features/planned-items/types';
import type { BudgetAccountLike, BudgetMemberLike } from '../types';
import { isRowDueInMonth, rowToAccountId, type PlanRow, type PlanRowIssue } from '../monthly-plan';
import { PLAN_CONTROL_HEIGHT, ScheduleFields, cleanAmountInput, usePlanInputStyle, usePlanTriggerStyle } from './plan-fields';

const INCOME_ACCOUNT_TYPES = ['cash', 'bank'];
const AMOUNT_WIDTH_WIDE = 130;
const AMOUNT_WIDTH_PHONE = 110;
const ICON_BUTTON = 36;

/** Column titles shown once above the income lines on wider screens (lines carry no labels, which keeps them all the same height). */
export function IncomeColumnsHeader() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  if (responsive.isPhone) return null;
  const style = { color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.bold), textTransform: 'uppercase' } as any;
  return (
    <View style={{ flexDirection: 'row', gap: spacing(2), paddingHorizontal: spacing(3) } as any}>
      <Text style={[style, { flex: 1.2 }]}>{t('budget.plan.nameLabel')}</Text>
      <Text style={[style, { flex: 1.2 }]}>{t('budget.plan.incomeAccount')}</Text>
      <Text style={[style, { width: AMOUNT_WIDTH_WIDE }]}>{t('budget.plan.amount')}</Text>
      <View style={{ width: ICON_BUTTON * 2 + spacing(1) } as any} />
    </View>
  );
}

export type IncomeLineRowProps = {
  row: PlanRow;
  /** "YYYY-MM" currently shown. */
  month: string;
  monthLabel: string;
  accounts: BudgetAccountLike[];
  members: BudgetMemberLike[];
  categories: CategoryPickerCategory[];
  issues: PlanRowIssue[];
  showIssues: boolean;
  onChange: (patch: Partial<PlannedItemDraft>) => void;
  onRemove: () => void;
};

/**
 * One income line: Name | Income account | Amount | options | remove, every
 * control the same fixed height. Category and schedule sit under options.
 */
export function IncomeLineRow({ row, month, monthLabel, accounts, members, categories, issues, showIssues, onChange, onRemove }: IncomeLineRowProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const inputStyle = usePlanInputStyle();
  const triggerStyle = usePlanTriggerStyle();
  const [expanded, setExpanded] = useState(false);

  const draft = row.draft;
  const accountId = rowToAccountId(row);
  const isDue = isRowDueInMonth(row, month);
  const hasIssues = showIssues && issues.length > 0;
  const statusNote = !draft.isActive
    ? t('budget.plan.paused')
    : !isDue
      ? t('budget.plan.notThisMonth', { month: monthLabel, schedule: formatPlannedItemRecurrenceSummary(draft) })
      : draft.recurrenceType !== 'monthly'
        ? formatPlannedItemRecurrenceSummary(draft)
        : null;
  const dimmed = !draft.isActive || !isDue;

  const nameInput = (
    <TextInput
      value={draft.name}
      onChangeText={(value) => onChange({ name: value })}
      placeholder={t('budget.plan.incomeNamePlaceholder')}
      placeholderTextColor={colors.textSecondary}
      accessibilityLabel={t('budget.plan.nameLabel')}
      style={inputStyle}
    />
  );
  const accountSelect = (
    <GroupedAccountSelect
      hideLabel
      triggerStyle={triggerStyle}
      label={t('budget.plan.incomeAccount')}
      accounts={accounts.filter((account) => account.id === accountId || (!account.is_archived && INCOME_ACCOUNT_TYPES.includes(account.type)))}
      members={members}
      value={accountId}
      placeholder={t('budget.plan.selectIncomeAccount')}
      sharedLabel={t('budget.shared')}
      unassignedLabel={t('settings.unnamedUser')}
      closeLabel={t('cancel')}
      onChange={(id) => {
        const current = draft.destinations[0];
        onChange({ destinations: [current ? { ...current, destinationAccountId: id } : { id: `dest-${row.key}`, destinationAccountId: id, amount: '', percent: '', categoryId: null }] });
      }}
    />
  );
  const amountInput = (
    <TextInput
      value={draft.amount}
      onChangeText={(value) => onChange({ amount: cleanAmountInput(value) })}
      keyboardType="decimal-pad"
      placeholder="0.00"
      placeholderTextColor={colors.textSecondary}
      accessibilityLabel={t('budget.plan.amount')}
      style={[inputStyle, { textAlign: 'right', fontWeight: String(typography.fontWeight.bold) }]}
    />
  );
  const iconButton = (name: string, color: string, label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{ width: ICON_BUTTON, height: PLAN_CONTROL_HEIGHT, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={name as any} size={19} color={color} />
    </Pressable>
  );
  const icons = (
    <View style={{ flexDirection: 'row', gap: spacing(1) } as any}>
      {iconButton(expanded ? 'chevron-up' : statusNote ? 'calendar-outline' : 'options-outline', statusNote && !expanded ? colors.warning : colors.textSecondary, t('budget.plan.moreOptions'), () => setExpanded((current) => !current))}
      {iconButton('trash-outline', colors.destructive, t('budget.plan.remove'), onRemove)}
    </View>
  );

  return (
    <View style={{ gap: spacing(2), padding: spacing(2), borderRadius: radius.lg, borderWidth: 1, borderColor: hasIssues ? colors.destructive : colors.border, backgroundColor: colors.surfaceMuted } as any}>
      {responsive.isPhone ? (
        <View style={{ gap: spacing(2), opacity: dimmed ? 0.6 : 1 } as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
            <View style={{ flex: 1, minWidth: 0 } as any}>{nameInput}</View>
            {icons}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
            <View style={{ flex: 1, minWidth: 0 } as any}>{accountSelect}</View>
            <View style={{ width: AMOUNT_WIDTH_PHONE } as any}>{amountInput}</View>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), opacity: dimmed ? 0.6 : 1 } as any}>
          <View style={{ flex: 1.2, minWidth: 0 } as any}>{nameInput}</View>
          <View style={{ flex: 1.2, minWidth: 0 } as any}>{accountSelect}</View>
          <View style={{ width: AMOUNT_WIDTH_WIDE } as any}>{amountInput}</View>
          {icons}
        </View>
      )}

      {hasIssues ? (
        <Text style={{ color: colors.destructive, fontSize: typography.fontSize[12], paddingHorizontal: spacing(1) } as any}>
          {issues.map((issue) => t(`budget.plan.issues.${issue}`)).join(' · ')}
        </Text>
      ) : null}

      {expanded ? (
        <View style={{ gap: spacing(2.5), padding: spacing(1), paddingTop: spacing(2.5), borderTopWidth: 1, borderTopColor: colors.border } as any}>
          {statusNote ? <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>{statusNote}</Text> : null}
          <CategoryPicker
            label={t('budget.plan.category')}
            placeholder={t('budget.plannedItems.categoryPlaceholder')}
            categories={categories}
            selectedId={draft.categoryId || null}
            onChange={(categoryId) => onChange({ categoryId: categoryId ?? '' })}
          />
          <ScheduleFields draft={draft} month={month} monthLabel={monthLabel} onChange={onChange} />
        </View>
      ) : null}
    </View>
  );
}
