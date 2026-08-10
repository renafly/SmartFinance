import { Text, View } from 'react-native';

import { Badge } from '@/components/data-surface';
import { CategoryPicker } from '@/components/category-picker';
import { GroupedAccountSelect } from '@/components/grouped-account-select';
import { GroupedDestinationSelect } from '@/components/grouped-destination-select';
import { HouseholdMemberSelect } from '@/components/household-member-select';
import { Field, Pill } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from '../ui-styles';
import { frequencies, months } from '../types';
import type { ExpenseKind, MovementDraft, TransactionType } from '../types';
import { DatePickerField } from './movement-date-field';

type MovementFieldsProps = {
  value: MovementDraft;
  onChange: (patch: Partial<MovementDraft>) => void;
  accounts: any[];
  potNameByAccountId: Record<string, string>;
  members: any[];
  categories: any[];
  typeLabels: Record<string, string>;
  t: any;
  lockKind?: boolean;
};

export function MovementFields({
  value,
  onChange,
  accounts,
  potNameByAccountId,
  members,
  categories,
  typeLabels,
  t,
  lockKind = false,
}: MovementFieldsProps) {
  const { colors } = useTheme();
  const isScheduled = value.kind !== 'one-off';
  const isTransfer = value.kind !== 'recurring-transaction';
  const allowedSourceIds = value.destination?.id
    ? accounts.filter((account) => account.id !== value.destination?.id).map((account) => account.id)
    : undefined;
  const allowedDestinationIds = value.sourceAccountId
    ? accounts.filter((account) => account.id !== value.sourceAccountId).map((account) => account.id)
    : undefined;
  const toggleMonth = (month: number) =>
    onChange({
      excludedMonths: value.excludedMonths.includes(month)
        ? value.excludedMonths.filter((entry) => entry !== month)
        : [...value.excludedMonths, month].sort((left, right) => left - right),
    });

  return (
    <View style={styles.formFields}>
      {!lockKind ? null : (
        <Badge
          label={t(
            value.kind === 'recurring-transfer' ? 'transfers.types.recurringTransfer' : 'transfers.types.recurringTransaction',
          )}
          tone="neutral"
        />
      )}
      <Field label={t('recurring.titleLabel')} value={value.title} onChangeText={(title) => onChange({ title })} />
      <Field label={t('recurring.amount')} value={value.amount} onChangeText={(amount) => onChange({ amount })} keyboardType="numeric" />
      <Field label={t('transfers.notes')} value={value.notes} onChangeText={(notes) => onChange({ notes })} />
      {isScheduled ? (
        <DatePickerField
          label={t('recurring.nextRun')}
          value={value.nextRun}
          onChange={(nextRun) => onChange({ nextRun })}
          placeholder={t('recurring.nextRunPlaceholder')}
        />
      ) : (
        <DatePickerField
          label={t('transfers.formDate')}
          value={value.nextRun}
          onChange={(nextRun) => onChange({ nextRun })}
          placeholder={t('recurring.nextRunPlaceholder')}
        />
      )}
      {isScheduled ? (
        <HouseholdMemberSelect
          label={t('recurring.createdBy')}
          members={members}
          value={value.createdById}
          placeholder={t('recurring.createdByPlaceholder')}
          hint={t('recurring.createdByPlaceholder')}
          onChange={(createdById) => onChange({ createdById })}
        />
      ) : null}
      {isScheduled ? (
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('transfers.frequency')}</Text>
          <View style={styles.pillRow}>
            {frequencies.map((frequency) => (
              <Pill
                key={frequency}
                label={t(`recurring.frequencies.${frequency}`)}
                active={value.frequency === frequency}
                onPress={() => onChange({ frequency })}
              />
            ))}
          </View>
        </View>
      ) : null}
      {isScheduled && value.frequency === 'custom' ? (
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('transfers.excludeMonths')}</Text>
          <Text style={{ color: colors.textSecondary }}>{t('transfers.excludeMonthsHint')}</Text>
          <View style={styles.pillRow}>
            {months.map((month) => (
              <Pill
                key={month.value}
                label={t(`transfers.months.${month.key}`)}
                active={value.excludedMonths.includes(month.value)}
                onPress={() => toggleMonth(month.value)}
              />
            ))}
          </View>
        </View>
      ) : null}
      <GroupedAccountSelect
        label={isTransfer ? t('transfers.sourceAccount') : t('recurring.account')}
        accounts={accounts}
        members={members}
        value={value.sourceAccountId}
        placeholder={isTransfer ? t('transfers.sourceAccount') : t('recurring.account')}
        hint={isTransfer ? t('transfers.sourceAccount') : t('recurring.account')}
        onChange={(sourceAccountId) => onChange({ sourceAccountId })}
        allowedAccountIds={allowedSourceIds}
        closeLabel={t('close')}
        sharedLabel={t('dashboard.shared')}
        unassignedLabel={t('settings.unnamedUser')}
        typeLabels={typeLabels}
      />
      {isTransfer ? (
        <GroupedDestinationSelect
          label={t('transfers.destination')}
          accounts={accounts}
          members={members}
          value={value.destination}
          placeholder={t('transfers.destination')}
          hint={t('transfers.destination')}
          onChange={(destination) => onChange({ destination })}
          allowedAccountIds={allowedDestinationIds}
          closeLabel={t('close')}
          sharedLabel={t('dashboard.shared')}
          unassignedLabel={t('settings.unnamedUser')}
          typeLabels={typeLabels}
          potNameByAccountId={potNameByAccountId}
          potLabel={t('transfers.pigBank')}
        />
      ) : null}
      {!isTransfer ? (
        <>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('transfers.transactionType')}</Text>
            <View style={styles.pillRow}>
              {(['income', 'expense'] as TransactionType[]).map((transactionType) => (
                <Pill
                  key={transactionType}
                  label={t(`recurring.types.${transactionType}`)}
                  active={value.transactionType === transactionType}
                  onPress={() =>
                    onChange({
                      transactionType,
                      categoryId: null,
                      expenseKind: transactionType === 'expense' ? value.expenseKind : 'other',
                    })
                  }
                />
              ))}
            </View>
          </View>
          {value.transactionType === 'expense' ? (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('transfers.expenseKind')}</Text>
              <View style={styles.pillRow}>
                {(['subscription', 'bill', 'other'] as ExpenseKind[]).map((expenseKind) => (
                  <Pill
                    key={expenseKind}
                    label={t(`transfers.expenseKinds.${expenseKind}`)}
                    active={value.expenseKind === expenseKind}
                    onPress={() => onChange({ expenseKind })}
                  />
                ))}
              </View>
            </View>
          ) : null}
          <CategoryPicker
            label={t('recurring.category')}
            placeholder={t('recurring.category')}
            categories={categories}
            selectedId={value.categoryId}
            clearLabel={t('none')}
            onChange={(categoryId) => onChange({ categoryId })}
          />
        </>
      ) : null}
    </View>
  );
}
