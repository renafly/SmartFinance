import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Pill } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import type { PlannedItemDraft } from '@/features/planned-items/types';
import { MONTH_OPTIONS } from '../ui-utils';

/** Every inline control on the Monthly Budget is exactly this tall, so lines line up and have the same height. */
export const PLAN_CONTROL_HEIGHT = 44;

export function usePlanInputStyle() {
  const { colors } = useTheme();
  return {
    height: PLAN_CONTROL_HEIGHT,
    paddingHorizontal: spacing(3),
    borderWidth: 1,
    borderRadius: radius.md,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typography.fontSize[14],
  } as any;
}

export function usePlanTriggerStyle() {
  const { colors } = useTheme();
  return { height: PLAN_CONTROL_HEIGHT, paddingVertical: 0, borderRadius: radius.md, backgroundColor: colors.surface } as any;
}

export function FieldLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13], fontWeight: String(typography.fontWeight.semibold) } as any}>{children}</Text>
  );
}

/** Keeps only digits, separators and spaces -- parseAmount handles "1 000,50". */
export function cleanAmountInput(value: string) {
  return value.replace(/[^0-9.,\s]/g, '');
}

/** Repeat schedule + pause toggle, shared by income lines and movements. */
export function ScheduleFields({
  draft,
  month,
  monthLabel,
  onChange,
}: {
  draft: PlannedItemDraft;
  month: string;
  monthLabel: string;
  onChange: (patch: Partial<PlannedItemDraft>) => void;
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const inputStyle = usePlanInputStyle();

  function setRecurrence(type: PlannedItemDraft['recurrenceType']) {
    const patch: Partial<PlannedItemDraft> = { recurrenceType: type, isEstimate: false };
    if (type === 'one_time') patch.oneTimeMonth = month;
    if (type === 'interval' && !draft.startMonth) patch.startMonth = month;
    if (type === 'specific_months' && draft.recurrenceMonths.length === 0) patch.recurrenceMonths = [Number(month.slice(5, 7))];
    onChange(patch);
  }

  function toggleMonth(value: number) {
    onChange({
      recurrenceMonths: draft.recurrenceMonths.includes(value)
        ? draft.recurrenceMonths.filter((entry) => entry !== value)
        : [...draft.recurrenceMonths, value].sort((a, b) => a - b),
    });
  }

  return (
    <View style={{ gap: spacing(2.5) } as any}>
      <View style={{ gap: spacing(1.5) } as any}>
        <FieldLabel>{t('budget.plan.schedule')}</FieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
          <Pill label={t('budget.plan.scheduleMonthly')} active={draft.recurrenceType === 'monthly'} onPress={() => setRecurrence('monthly')} />
          <Pill label={t('budget.plan.scheduleSpecificMonths')} active={draft.recurrenceType === 'specific_months'} onPress={() => setRecurrence('specific_months')} />
          <Pill label={t('budget.plan.scheduleInterval')} active={draft.recurrenceType === 'interval'} onPress={() => setRecurrence('interval')} />
          <Pill label={t('budget.plan.scheduleOnce', { month: monthLabel })} active={draft.recurrenceType === 'one_time'} onPress={() => setRecurrence('one_time')} />
        </View>
        {draft.recurrenceType === 'specific_months' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) } as any}>
            {MONTH_OPTIONS.map((option) => (
              <Pill key={option.value} label={option.label} active={draft.recurrenceMonths.includes(option.value)} onPress={() => toggleMonth(option.value)} />
            ))}
          </View>
        ) : null}
        {draft.recurrenceType === 'interval' ? (
          <View style={{ gap: spacing(1), maxWidth: 240 } as any}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{t('budget.plan.everyNMonths')}</Text>
            <TextInput
              value={draft.recurrenceIntervalMonths}
              onChangeText={(value) => onChange({ recurrenceIntervalMonths: value.replace(/[^0-9]/g, '') })}
              keyboardType="number-pad"
              placeholder="3"
              placeholderTextColor={colors.textSecondary}
              style={inputStyle}
            />
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
              {t('budget.plan.intervalStartsIn', { month: draft.startMonth || month })}
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable onPress={() => onChange({ isActive: !draft.isActive })} accessibilityRole="button">
        <Text style={{ color: colors.primary, fontSize: typography.fontSize[13], fontWeight: String(typography.fontWeight.semibold) } as any}>
          {draft.isActive ? t('budget.plan.pause') : t('budget.plan.resume')}
        </Text>
      </Pressable>
    </View>
  );
}
