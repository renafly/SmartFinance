import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { formatCurrency } from '@/components/migrated-page';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';

type GoalMeterProps = {
  balance: number;
  target?: number | null;
};

export function GoalMeter({ balance, target }: GoalMeterProps) {
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const progress = target && target > 0 ? Math.min(balance / target, 1) : 0;
  const progressPercent = Math.round(progress * 100);
  const balanceLabel = displayCurrency(formatCurrency(balance), hideValues);
  const targetLabel = displayCurrency(formatCurrency(target ?? 0), hideValues);

  return (
    <View
      style={styles.goalMeter}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: progressPercent }}
    >
      <View style={[styles.goalTrack, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.goalFill, { backgroundColor: colors.success, flexGrow: progress }]} />
        <View style={{ flexGrow: 1 - progress }} />
      </View>
      <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
        {target && target > 0 ? `${progressPercent}% - ${balanceLabel} / ${targetLabel}` : balanceLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  goalMeter: {
    gap: spacing(1),
  },
  goalTrack: {
    minHeight: spacing(2.5),
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  goalFill: {},
  goalLabel: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
});
