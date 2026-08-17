import { Fragment } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Field, Pill, Button, formatCurrency } from '@/components/migrated-page';
import { GroupedAccountSelect } from '@/components/grouped-account-select';
import { CategoryPicker, type CategoryPickerCategory } from '@/components/category-picker';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';

import type {
  MonthlyBudgetRuleAllocationDraft,
  MonthlyBudgetRuleDraft,
} from '../services/monthly-budget.service';
import type { BudgetAccountLike, BudgetMemberLike } from '../types';
import { MONTH_OPTIONS, formatMonthSelection, getMemberLabel, getSectionBadgeIcon, getSectionBadgeStyle } from '../ui-utils';

type AllocationMode = MonthlyBudgetRuleDraft['allocationMode'];

type BudgetRuleCardProps = {
  rule: MonthlyBudgetRuleDraft;
  isCollapsed: boolean;
  isValid?: boolean;
  style?: StyleProp<ViewStyle>;
  accounts: BudgetAccountLike[];
  members: BudgetMemberLike[];
  /** Expense categories (main + sub) an allocation can optionally be tagged
   * with — the same list a normal expense transaction would use. Passing
   * an empty array just hides the picker's options; the field itself
   * always renders since a category is optional. */
  categories: CategoryPickerCategory[];
  accountNameMap: Map<string, string>;
  destinationAccountTypeLabels: Record<string, string>;
  incomeCashAccounts: BudgetAccountLike[];
  incomeCashAccountIds: string[];
  onToggleCollapse: () => void;
  onUpdateRule: (patch: Partial<MonthlyBudgetRuleDraft>) => void;
  onUpdateActiveMonths: (monthValue: number) => void;
  onSetAllocationMode: (mode: AllocationMode) => void;
  onAddAllocation: () => void;
  onRemoveAllocation: (allocationId: string) => void;
  onUpdateAllocation: (allocationId: string, patch: Partial<MonthlyBudgetRuleAllocationDraft>) => void;
  onRemoveRule: () => void;
};

function sumAllocations(allocations: MonthlyBudgetRuleAllocationDraft[]) {
  return Math.round(allocations.reduce((sum, allocation) => sum + (Number(allocation.amount) || 0), 0) * 100) / 100;
}

/**
 * Assigned / remaining (or overallocated) readout for custom allocations.
 * Equal-split rules always balance by construction, so this only needs to
 * shout when the mode is custom and the user hasn't finished distributing
 * the total yet — an underallocated or overallocated rule cannot be saved,
 * so this has to be impossible to miss.
 */
function AllocationSummary({ total, assigned }: { total: number; assigned: number }) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const money = (value: number | string | null | undefined) => displayCurrency(formatCurrency(value), hideValues);
  const remaining = Math.round((total - assigned) * 100) / 100;
  const isBalanced = Math.abs(remaining) < 0.01;
  const isOver = remaining < -0.01;

  return (
    <View
      style={{
        gap: spacing(1.5),
        padding: spacing(3),
        borderRadius: radius.lg,
        borderWidth: isBalanced ? 1 : 2,
        borderColor: isBalanced ? colors.border : colors.destructive,
        backgroundColor: isBalanced ? colors.surface : colors.destructiveSoft,
      } as any}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
        <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
          {t('budget.allocationTotal')}
        </Text>
        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{money(total)}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
        <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
          {t('budget.allocationAssigned')}
        </Text>
        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{money(assigned)}</Text>
      </View>
      {!isBalanced ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
          <Ionicons name="warning" size={16} color={colors.destructive} />
          <Text style={{ flex: 1, color: colors.destructive, fontWeight: String(typography.fontWeight.extraBold) } as any}>
            {isOver
              ? t('budget.allocationOverBy', { amount: money(Math.abs(remaining)) })
              : t('budget.allocationRemaining', { amount: money(Math.abs(remaining)) })}
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={{ color: colors.success, fontWeight: String(typography.fontWeight.semibold) } as any}>
            {t('budget.allocationBalanced')}
          </Text>
        </View>
      )}
    </View>
  );
}

export function BudgetRuleCard({
  rule,
  isCollapsed,
  isValid = true,
  style,
  accounts,
  members,
  categories,
  accountNameMap,
  destinationAccountTypeLabels,
  incomeCashAccounts,
  incomeCashAccountIds,
  onToggleCollapse,
  onUpdateRule,
  onUpdateActiveMonths,
  onSetAllocationMode,
  onAddAllocation,
  onRemoveAllocation,
  onUpdateAllocation,
  onRemoveRule,
}: BudgetRuleCardProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const activeMonthsLabel = formatMonthSelection(rule.activeMonths);
  const badge = getSectionBadgeStyle(rule.section, colors);
  const totalAmount = Number(rule.amount) || 0;
  const assignedAmount = sumAllocations(rule.allocations);
  const isEqualSplit = rule.allocationMode === 'equal_split';
  const memberByUserId = new Map(members.map((member) => [member.userId, member]));
  const accountOwnerIdByAccountId = new Map(accounts.map((account) => [account.id, account.owner_profile_id]));
  const getAccountOwnerLabel = (accountId: string) => {
    if (!accountId) return '';
    const ownerId = accountOwnerIdByAccountId.get(accountId);
    return getMemberLabel(ownerId ? memberByUserId.get(ownerId) : null, t('budget.shared'));
  };
  const destinationSummary =
    rule.allocations.length === 0
      ? t('budget.selectDestinationAccount')
      : rule.allocations.length === 1
        ? (accountNameMap.get(rule.allocations[0].destinationAccountId) ?? t('budget.selectDestinationAccount'))
        : t('budget.destinationAccountsCount', { count: rule.allocations.length });

  return (
    <View
      style={[
        {
          gap: spacing(3),
          padding: spacing(3.5),
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: isValid ? colors.border : colors.warning,
          backgroundColor: colors.surfaceMuted,
        },
        style,
      ] as any}
    >
      <Pressable
        onPress={onToggleCollapse}
        accessibilityRole="button"
        accessibilityState={{ expanded: !isCollapsed }}
        accessibilityLabel={rule.name || t('budget.ruleNamePlaceholder')}
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
            <View style={{ paddingHorizontal: spacing(2), paddingVertical: spacing(0.75), borderRadius: radius.full, backgroundColor: badge.backgroundColor } as any}>
              <Text style={{ color: badge.color, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.extraBold), letterSpacing: typography.letterSpacing[10], textTransform: 'uppercase' } as any}>
                {t(`budget.sections.${rule.section}`)}
              </Text>
            </View>
            {!isValid ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing(1),
                  paddingHorizontal: spacing(2),
                  paddingVertical: spacing(0.75),
                  borderRadius: radius.full,
                  backgroundColor: colors.warningSoft,
                } as any}
              >
                <Ionicons name="alert-circle-outline" size={12} color={colors.warning} />
                <Text style={{ color: colors.warning, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.extraBold), letterSpacing: typography.letterSpacing[10], textTransform: 'uppercase' } as any}>
                  {t('budget.ruleIncomplete')}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={{ color: colors.textSecondary } as any}>
            {displayCurrency(formatCurrency(totalAmount), hideValues)}
            {' · '}
            <Ionicons name="swap-horizontal-outline" size={12} color={colors.textSecondary} /> {t('budget.sourceAccount')}: {accountNameMap.get(rule.sourceAccountId) ?? t('budget.selectSourceAccount')}
            {' · '}
            <Ionicons name="wallet-outline" size={12} color={colors.textSecondary} /> {t('budget.destinationAccount')}: {destinationSummary}
          </Text>
        </View>
        <Ionicons name={isCollapsed ? 'chevron-forward-outline' : 'chevron-down-outline'} size={18} color={colors.textSecondary} />
      </Pressable>

      {!isCollapsed ? (
        <Fragment>
          <Field
            label={t('budget.ruleName')}
            value={rule.name}
            onChangeText={(value) => onUpdateRule({ name: value })}
            placeholder={t('budget.ruleNamePlaceholder')}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.section')}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {(['savings', 'pots', 'investments', 'ppr', 'remaining_cash'] as const).map((section) => (
              <Pill key={section} label={t(`budget.sections.${section}`)} active={rule.section === section} onPress={() => onUpdateRule({ section })} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.owner')}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            <Pill label={t('budget.shared')} active={!rule.ownerMemberId} onPress={() => onUpdateRule({ ownerMemberId: null })} />
            {members.map((member) => (
              <Pill key={member.userId} label={getMemberLabel(member, t('budget.shared'))} active={rule.ownerMemberId === member.userId} onPress={() => onUpdateRule({ ownerMemberId: member.userId })} />
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
                  onPress={() => onUpdateActiveMonths(option.value)}
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
                onChangeText={(value) => onUpdateRule({ activeFromMonth: value })}
                keyboardType="numeric"
                placeholder="1"
                style={{ flex: 1, minWidth: 140 }}
              />
              <Field
                label={t('budget.activeToMonth')}
                value={rule.activeToMonth}
                onChangeText={(value) => onUpdateRule({ activeToMonth: value })}
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
            onChange={(accountId) => onUpdateRule({ sourceAccountId: accountId })}
          />
          <Field
            label={t('budget.amount')}
            value={rule.amount}
            onChangeText={(value) => onUpdateRule({ amount: value })}
            keyboardType="numeric"
            placeholder="0.00"
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name="git-branch-outline" size={14} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
              {t('budget.allocationMode')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            <Pill label={t('budget.allocationModes.equal_split')} active={isEqualSplit} onPress={() => onSetAllocationMode('equal_split')} />
            <Pill label={t('budget.allocationModes.custom')} active={!isEqualSplit} onPress={() => onSetAllocationMode('custom')} />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
            {isEqualSplit ? t('budget.allocationModeHintEqual') : t('budget.allocationModeHintCustom')}
          </Text>

          <View style={{ gap: spacing(2.5) } as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) } as any}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                <Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
                  {t('budget.destinationAccounts')}
                </Text>
              </View>
              <Button label={t('budget.addDestination')} onPress={onAddAllocation} variant="secondary" />
            </View>

            {rule.allocations.map((allocation, index) => {
              const allowedAccountIds = accounts
                .map((account) => account.id)
                .filter(
                  (accountId) =>
                    accountId === allocation.destinationAccountId ||
                    !rule.allocations.some((other) => other.id !== allocation.id && other.destinationAccountId === accountId),
                );

              return (
                <View
                  key={allocation.id}
                  style={{
                    gap: spacing(2),
                    padding: spacing(2.5),
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  } as any}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) } as any}>
                    <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
                      {t('budget.destinationAccountIndex', { index: index + 1 })}
                    </Text>
                    {rule.allocations.length > 1 ? (
                      <Pressable
                        onPress={() => onRemoveAllocation(allocation.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t('budget.removeDestination')}
                        hitSlop={8}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={colors.destructive} />
                      </Pressable>
                    ) : null}
                  </View>
                  <GroupedAccountSelect
                    label={t('budget.destinationAccount')}
                    accounts={accounts}
                    members={members}
                    value={allocation.destinationAccountId}
                    placeholder={t('budget.selectDestinationAccount')}
                    hint={t('budget.destinationAccountHint')}
                    groupBy="type"
                    typeLabels={destinationAccountTypeLabels}
                    allowedAccountIds={allowedAccountIds}
                    sharedLabel={t('budget.shared')}
                    unassignedLabel={t('settings.unnamedUser')}
                    closeLabel={t('cancel')}
                    onChange={(accountId) => onUpdateAllocation(allocation.id, { destinationAccountId: accountId })}
                  />
                  {allocation.destinationAccountId ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) } as any}>
                      <Ionicons name="person-circle-outline" size={12} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
                        {t('budget.destinationAccountOwner', { name: getAccountOwnerLabel(allocation.destinationAccountId) })}
                      </Text>
                    </View>
                  ) : null}
                  <Field
                    label={t('budget.allocationAmount')}
                    value={allocation.amount}
                    onChangeText={(value) => onUpdateAllocation(allocation.id, { amount: value })}
                    keyboardType="numeric"
                    placeholder="0.00"
                    editable={!isEqualSplit}
                    style={isEqualSplit ? { opacity: 0.6 } : undefined}
                  />
                  <CategoryPicker
                    label={t('budget.allocationCategory')}
                    placeholder={t('budget.allocationCategoryPlaceholder')}
                    hint={t('budget.allocationCategoryHint')}
                    categories={categories}
                    selectedId={allocation.categoryId}
                    clearLabel={t('budget.allocationCategoryNone')}
                    onChange={(categoryId) => onUpdateAllocation(allocation.id, { categoryId })}
                  />
                </View>
              );
            })}
          </View>

          <AllocationSummary total={totalAmount} assigned={assignedAmount} />

          <Field
            label={t('budget.priority')}
            value={rule.priority}
            onChangeText={(value) => onUpdateRule({ priority: value })}
            keyboardType="numeric"
            placeholder="0"
          />
        </Fragment>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
        <Pill label={rule.isActive ? t('budget.active') : t('budget.inactive')} active={rule.isActive} onPress={() => onUpdateRule({ isActive: !rule.isActive })} />
        <Button label={t('delete')} onPress={onRemoveRule} variant="danger" />
      </View>
    </View>
  );
}
