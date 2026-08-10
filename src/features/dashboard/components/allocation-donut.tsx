import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useResponsiveMetrics } from '@/theme/responsive';

import { getPercent } from '../utils';
import type { AllocationSegment } from '../types';

type AllocationDonutProps = {
  segments: AllocationSegment[];
  total: number;
};

export function AllocationDonut({ segments, total }: AllocationDonutProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const size = responsive.isPhone ? spacing(34) : spacing(40);
  const strokeWidth = spacing(3.25);
  const radiusValue = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const visibleSegments = total > 0
    ? segments.filter((segment) => Number.isFinite(segment.value) && segment.value > 0)
    : [];
  let offset = 0;

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {visibleSegments.map((segment) => {
          const share = segment.value / total;
          const dashLength = Math.max(circumference * share, 0);
          const gapLength = Math.max(circumference - dashLength, 0);
          const dashOffset = -offset;
          offset += dashLength;

          return (
            <Circle
              key={segment.key}
              cx={size / 2}
              cy={size / 2}
              r={radiusValue}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={[dashLength, gapLength]}
              strokeDashoffset={dashOffset}
              strokeLinecap={visibleSegments.length > 1 ? 'round' : 'butt'}
              fill="transparent"
            />
          );
        })}
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={[styles.donutCenterLabel, { color: colors.textSecondary }]}>{getPercent(segments[0]?.value ?? 0, total)}%</Text>
        <Text style={[styles.donutCenterText, { color: colors.text }]}>{segments[0]?.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  donutCenterLabel: {
    fontSize: typography.fontSize[28],
    lineHeight: typography.lineHeight[32],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  donutCenterText: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
    fontWeight: typography.fontWeight.bold as any,
  },
});
