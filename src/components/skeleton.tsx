import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type SkeletonRowsProps = {
  /** Number of placeholder rows. */
  count?: number;
  /** Height of each row, in px. */
  rowHeight?: number;
  /** Accessible label; defaults to the generic "loading" copy. */
  label?: string;
};

/**
 * Pulsing placeholder rows shown while a list or panel loads, so the layout
 * keeps its shape instead of jumping from a line of text to the real content.
 * The pulse is skipped when the OS asks for reduced motion.
 */
export function SkeletonRows({ count = 3, rowHeight = 44, label }: SkeletonRowsProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((reduce) => {
        if (cancelled || reduce) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
          ]),
        );
        loop.start();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [opacity]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? t('loading')}
      style={{ gap: spacing(2) }}
    >
      {Array.from({ length: count }, (_, index) => (
        <Animated.View
          key={index}
          testID="skeleton-row"
          style={{
            height: rowHeight,
            // Stagger widths slightly so the placeholder reads as content, not a block.
            width: index % 3 === 2 ? '72%' : '100%',
            borderRadius: radius.md,
            backgroundColor: colors.surfaceMuted,
            opacity,
          }}
        />
      ))}
    </View>
  );
}
