import { Fragment } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Field, Pill, Button, formatCurrency } from '@/components/migrated-page';
import { GroupedAccountSelect } from '@/components/grouped-account-select';
import { GroupedDestinationSelect, type DestinationSelection } from '@/components/grouped-destination-select';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import type { MonthlyBudgetRuleDraft } from '../hooks';
import type { BudgetAccountLike, BudgetMemberLike } from '../types';
import { MONTH_OPTIONS, formatMonthSelection, getMemberLabel, getSectionBadgeIcon, getSectionBadgeStyle } from '../ui-utils';

type BudgetRuleCardProps = {
  rule: MonthlyBudgetRuleDraft;
  isCollapsed: boolean;
  isValid?: boolean;
  style?: StyleProp<ViewStyle>;
  accounts: BudgetAccountLike[];
  members: BudgetMemberLike[];
  accountNameMap: Map<string, string>;
  destinationAccountTypeLabels: Record<string, string>;
  potNameByAccountId: Record<string, string>;
  incomeCashAccounts: BudgetAccountLike[];
  incomeCashAccountIds: string[];
  onToggleCollapse: () => void;
  onUpdateRule: (patch: Partial<MonthlyBudgetRuleDraft>) => void;
  onUpdateActiveMonths: (monthValue: number) => void;
  onUpdateDestination: (selection: DestinationSelection) => void;
  onRemoveRule: () => void;
};

export function BudgetRuleCard({
  rule,
  isCollapsed,
  isValid = true,
  style,
  accounts,
  members,
  accountNameMap,
  destinationAccountTypeLabels,
  potNameByAccountId,
  incomeCashAccounts,
  incomeCashAccountIds,
  onToggleCollapse,
  onUpdateRule,
  onUpdateActiveMonths,
  onUpdateDestination,
  onRemoveRule,
}: BudgetRuleCardProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const destinationLabel = accountNameMap.get(rule.destinationAccountId) ?? t('budget.selectDestinationAccount');
  const activeMonthsLabel = formatMonthSelection(rule.activeMonths);
  const badge = getSectionBadgeStyle(rule.section, colors);

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
            onChange={onUpdateDestination}
          />
          <Field
            label={t('budget.amount')}
            value={rule.amount}
            onChangeText={(value) => onUpdateRule({ amount: value })}
            keyboardType="numeric"
            placeholder="0.00"
          />
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
