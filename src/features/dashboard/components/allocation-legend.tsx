import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { formatCurrency } from '@/components/migrated-page';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';

import { getPercent } from '../utils';
import type { AllocationSegment } from '../types';

type AllocationLegendProps = {
  segments: AllocationSegment[];
  total: number;
};

export function AllocationLegend({ segments, total }: AllocationLegendProps) {
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);

  return (
    <View style={styles.legendList}>
      {segments.map((segment) => (
        <View key={segment.key} style={[styles.legendItem, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.legendIcon, { backgroundColor: segment.color }]}>
            <Ionicons name={segment.icon} size={16} color={colors.primaryForeground} />
          </View>
          <View style={styles.legendCopy}>
            <Text style={[styles.legendLabel, { color: colors.text }]}>{segment.label}</Text>
            <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
              {displayCurrency(formatCurrency(segment.value), hideValues)} - {getPercent(segment.value, total)}%
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legendList: {
    gap: spacing(2),
    minWidth: spacing(48),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(2),
  },
  legendIcon: {
    width: spacing(8),
    height: spacing(8),
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing(0.5),
  },
  legendLabel: {
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  legendValue: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
});
