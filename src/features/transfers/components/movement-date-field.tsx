import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Ionicons } from '@expo/vector-icons';

import { DatePickerField as SharedDatePickerField } from '@/components/date-picker-field';
import { Button } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from '../ui-styles';
import { formatDateInput, parseDate } from '../utils';

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export function DatePickerField({ label, value, onChange, placeholder }: DatePickerFieldProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseDate(value) ?? new Date());

  if (Platform.OS === 'web') {
    return (
      <SharedDatePickerField
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    );
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={() => {
          if (!open) setDraftDate(parseDate(value) ?? new Date());
          setOpen((current) => !current);
        }}
        accessibilityRole="button"
        style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
      >
        <Text style={{ color: value ? colors.text : colors.textSecondary }}>{value || placeholder}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </Pressable>
      {open ? (
        <View style={[styles.datePicker, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
          <DateTimePicker
            value={draftDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            presentation={Platform.OS === 'android' ? 'dialog' : 'inline'}
            onValueChange={(_, nextDate) => {
              if (!nextDate) return;
              setDraftDate(nextDate);
              if (Platform.OS === 'android') {
                onChange(formatDateInput(nextDate));
                setOpen(false);
              }
            }}
            onDismiss={() => setOpen(false)}
          />
          {Platform.OS !== 'android' ? (
            <View style={styles.inlineActions}>
              <Button label={t('cancel')} variant="secondary" onPress={() => setOpen(false)} />
              <Button
                label={t('done')}
                onPress={() => {
                  onChange(formatDateInput(draftDate));
                  setOpen(false);
                }}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
