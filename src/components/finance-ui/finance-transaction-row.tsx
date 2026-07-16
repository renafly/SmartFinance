import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type FinanceTransactionRowProps = {
  title: string;
  amount: string;
  context?: string;
  icon?: ReactNode;
  direction?: 'income' | 'expense' | 'neutral';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function FinanceTransactionRow({ title, amount, context, icon, direction = 'neutral', onPress, style }: FinanceTransactionRowProps) {
  const { colors } = useTheme();
  const amountColor = direction === 'income' ? colors.financialPositive : direction === 'expense' ? colors.financialNegative : colors.text;
  const content = (
    <>
      {icon ? <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}>{icon}</View> : null}
      <View style={styles.copy}><Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>{context ? <Text style={[styles.context, { color: colors.textSecondary }]} numberOfLines={1}>{context}</Text> : null}</View>
      <Text style={[styles.amount, { color: amountColor }]} numberOfLines={1}>{amount}</Text>
    </>
  );
  const containerStyle = [styles.row, { borderBottomColor: colors.border }, style];
  if (!onPress) return <View style={containerStyle}>{content}</View>;
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [containerStyle, pressed && styles.pressed]}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(2.5), borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 40, height: 40, borderRadius: radius.base, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: spacing(0.5) },
  title: { fontSize: typography.fontSize[14], fontWeight: typography.fontWeight.semibold },
  context: { fontSize: typography.fontSize[12] },
  amount: { fontSize: typography.fontSize[14], fontWeight: typography.fontWeight.bold, textAlign: 'right' },
  pressed: { opacity: 0.75 },
});
