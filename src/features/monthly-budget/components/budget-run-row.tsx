import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { formatCurrency } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

function monthKey(value: string) {
  return value.slice(0, 7);
}

type BudgetRunRowProps = {
  run: any;
  active: boolean;
  onPress: () => void;
};

export function BudgetRunRow({ run, active, onPress }: BudgetRunRowProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${monthKey(run.month)} · ${run.status}`}
      style={({ pressed }) => [
        {
          padding: spacing(3.5),
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.primary : colors.surfaceMuted,
          opacity: pressed ? 0.9 : 1,
        },
      ] as any}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
        <Ionicons name="calendar-outline" size={16} color={active ? colors.primaryForeground : colors.textSecondary} />
        <Text style={{ color: active ? colors.primaryForeground : colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>
          {monthKey(run.month)} · {run.status}
        </Text>
      </View>
      <Text style={{ color: active ? colors.primaryForeground : colors.textSecondary } as any}>
        {t('budget.runPreview')}: {formatCurrency(Number((run.preview_snapshot as any)?.remainingCash ?? 0))}
      </Text>
    </Pressable>
  );
}
