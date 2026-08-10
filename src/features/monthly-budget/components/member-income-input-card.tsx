import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Field, Pill } from '@/components/migrated-page';
import { GroupedAccountSelect } from '@/components/grouped-account-select';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

import type { MonthlyBudgetIncomeDraft } from '../hooks';
import type { BudgetAccountLike, BudgetMemberLike } from '../types';
import { getMemberLabel } from '../ui-utils';

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.slice(0, 7).split('-').map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return shifted.toISOString().slice(0, 7);
}

type MemberIncomeInputCardProps = {
  member: BudgetMemberLike;
  draft: MonthlyBudgetIncomeDraft | undefined;
  currentBudgetMonth: string;
  accounts: BudgetAccountLike[];
  members: BudgetMemberLike[];
  isLast: boolean;
  onUpdateIncomeDraft: (patch: Partial<MonthlyBudgetIncomeDraft>) => void;
};

export function MemberIncomeInputCard({
  member,
  draft,
  currentBudgetMonth,
  accounts,
  members,
  isLast,
  onUpdateIncomeDraft,
}: MemberIncomeInputCardProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const availableMonth = draft?.availableMonth || currentBudgetMonth;

  return (
    <View
      style={{
        gap: spacing(2),
        paddingBottom: spacing(3),
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      } as any}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
        <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{getMemberLabel(member)}</Text>
      </View>
      <Field
        label={t('budget.salary')}
        value={draft?.amount ?? ''}
        onChangeText={(value) => onUpdateIncomeDraft({ amount: value })}
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
        onChange={(accountId) => onUpdateIncomeDraft({ cashAccountId: accountId })}
      />
      <View style={{ gap: spacing(1.5) }}>
        <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
          {t('budget.wageAvailability')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
          <Pill
            label={t('budget.wageAvailabilityThisMonth')}
            active={availableMonth === currentBudgetMonth}
            onPress={() => onUpdateIncomeDraft({ availableMonth: currentBudgetMonth })}
          />
          <Pill
            label={t('budget.wageAvailabilityNextMonth')}
            active={availableMonth === shiftMonth(currentBudgetMonth, 1)}
            onPress={() => onUpdateIncomeDraft({ availableMonth: shiftMonth(currentBudgetMonth, 1) })}
          />
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
          {t('budget.wageAvailabilityHint')}
        </Text>
      </View>
    </View>
  );
}
