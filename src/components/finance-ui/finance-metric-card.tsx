import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type FinanceMetricTone = 'positive' | 'negative' | 'neutral' | 'goal' | 'attention';

type FinanceMetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  trendLabel?: string;
  tone?: FinanceMetricTone;
  icon?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function FinanceMetricCard({
  label,
  value,
  detail,
  trendLabel,
  tone = 'neutral',
  icon,
  onPress,
  style,
}: FinanceMetricCardProps) {
  const { colors } = useTheme();
  const toneColors = getToneColors(colors, tone);
  const content = (
    <>
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        {icon ? <View style={[styles.icon, { backgroundColor: toneColors.soft }]}>{icon}</View> : null}
      </View>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      {detail || trendLabel ? (
        <View style={styles.detailRow}>
          {trendLabel ? <Text style={[styles.trend, { color: toneColors.foreground }]}>{trendLabel}</Text> : null}
          {detail ? <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={1}>{detail}</Text> : null}
        </View>
      ) : null}
    </>
  );

  const containerStyle = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style];
  if (!onPress) return <View style={containerStyle}>{content}</View>;

  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [containerStyle, pressed && styles.pressed]}>{content}</Pressable>;
}

function getToneColors(colors: ReturnType<typeof useTheme>['colors'], tone: FinanceMetricTone) {
  switch (tone) {
    case 'positive': return { foreground: colors.financialPositive, soft: colors.financialPositiveSoft };
    case 'negative': return { foreground: colors.financialNegative, soft: colors.financialNegativeSoft };
    case 'goal': return { foreground: colors.financialGoal, soft: colors.financialGoalSoft };
    case 'attention': return { foreground: colors.financialAttention, soft: colors.financialAttentionSoft };
    default: return { foreground: colors.financialNeutral, soft: colors.financialNeutralSoft };
  }
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.xxl, padding: spacing(4), gap: spacing(2), minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) },
  label: { fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.semibold, flex: 1 },
  icon: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: typography.fontSize[24], lineHeight: typography.lineHeight[30], fontWeight: typography.fontWeight.extraBold },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), minWidth: 0 },
  trend: { fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold },
  detail: { fontSize: typography.fontSize[12], flexShrink: 1 },
  pressed: { opacity: 0.82 },
});
