import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

import type { FinanceMetricTone } from './finance-metric-card';

type FinanceProgressBarProps = {
  value: number;
  label?: string;
  valueLabel?: string;
  tone?: FinanceMetricTone;
  style?: StyleProp<ViewStyle>;
};

export function FinanceProgressBar({ value, label, valueLabel, tone = 'goal', style }: FinanceProgressBarProps) {
  const { colors } = useTheme();
  const progress = Math.max(0, Math.min(100, value));
  const color = getToneColor(colors, tone);

  return (
    <View style={[styles.container, style]}>
      {label || valueLabel ? <View style={styles.labels}><Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.value, { color: colors.text }]}>{valueLabel ?? `${Math.round(progress)}%`}</Text></View> : null}
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }} style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
        <View style={[styles.fill, { backgroundColor: color, width: `${progress}%` }]} />
      </View>
    </View>
  );
}

function getToneColor(colors: ReturnType<typeof useTheme>['colors'], tone: FinanceMetricTone) {
  if (tone === 'positive') return colors.financialPositive;
  if (tone === 'negative') return colors.financialNegative;
  if (tone === 'attention') return colors.financialAttention;
  if (tone === 'neutral') return colors.financialNeutral;
  return colors.financialGoal;
}

const styles = StyleSheet.create({
  container: { gap: spacing(1.5) },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing(2) },
  label: { fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.medium, flex: 1 },
  value: { fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold },
  track: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
});
