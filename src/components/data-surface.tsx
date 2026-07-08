import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/migrated-page';
import { radius } from '@/theme/radius';
import { useResponsiveMetrics } from '@/theme/responsive';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'destructive';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { colors } = useTheme();
  const toneMap = {
    neutral: { backgroundColor: colors.surfaceMuted, color: colors.textSecondary, borderColor: colors.border },
    primary: { backgroundColor: colors.primarySoft, color: colors.primary, borderColor: colors.primary },
    success: { backgroundColor: colors.successSoft, color: colors.success, borderColor: colors.success },
    warning: { backgroundColor: colors.warningSoft, color: colors.warning, borderColor: colors.warning },
    destructive: { backgroundColor: colors.destructiveSoft, color: colors.destructive, borderColor: colors.destructiveBorder },
  } as const;

  const style = toneMap[tone];

  return (
    <View style={[styles.badge, { backgroundColor: style.backgroundColor, borderColor: style.borderColor }] as any}>
      <Text style={[styles.badgeLabel, { color: style.color }] as any}>{label}</Text>
    </View>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  hint?: string;
};

export function MetricCard({ label, value, icon, hint }: MetricCardProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();

  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          minWidth: responsive.isPhone ? 0 : 170,
          padding: responsive.isPhone ? spacing(3) : spacing(3.5),
        },
      ] as any}
    >
      <View style={styles.metricHeader as any}>
        {icon ? <Ionicons name={icon} size={16} color={colors.textSecondary} /> : null}
        <Text style={[styles.metricLabel, { color: colors.textSecondary }] as any}>{label}</Text>
      </View>
      <Text
        style={[
          styles.metricValue,
          {
            color: colors.text,
            fontSize: responsive.isPhone ? typography.fontSize[22] : typography.fontSize[28],
            lineHeight: responsive.isPhone ? typography.lineHeight[28] : typography.lineHeight[32],
          },
        ] as any}
      >
        {value}
      </Text>
      {hint ? <Text style={[styles.metricHint, { color: colors.textSecondary }] as any}>{hint}</Text> : null}
    </View>
  );
}

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  icon = 'documents-outline',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();

  return (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
          padding: responsive.isPhone ? spacing(3) : spacing(4),
        },
      ] as any}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.border }] as any}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }] as any}>{title}</Text>
      {description ? <Text style={[styles.emptyDescription, { color: colors.textSecondary }] as any}>{description}</Text> : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

type TableColumn = {
  label: string;
  flex?: number;
  align?: 'left' | 'right' | 'center';
};

type TableRowProps = {
  children: ReactNode;
};

export function TableRow({ children }: TableRowProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();

  return (
    <View
      style={[
        styles.tableRow,
        {
          borderBottomColor: colors.border,
          flexDirection: responsive.isPhone ? 'column' : 'row',
          alignItems: responsive.isPhone ? 'stretch' : 'center',
          gap: responsive.tableCellGap,
          paddingHorizontal: responsive.isPhone ? spacing(2.5) : spacing(3),
          paddingVertical: responsive.isPhone ? spacing(2.25) : spacing(2.5),
        },
      ] as any}
    >
      {children}
    </View>
  );
}

type TableProps = {
  columns: TableColumn[];
  children: ReactNode;
};

export function Table({ columns, children }: TableProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();

  return (
    <View style={[styles.table, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }] as any}>
      {!responsive.isPhone ? (
        <View style={[styles.tableHeader, { backgroundColor: colors.surface, borderColor: colors.border }] as any}>
          {columns.map((column) => (
            <Text
              key={column.label}
              style={[
                styles.tableHeaderLabel,
                {
                  flex: column.flex ?? 1,
                  textAlign: column.align ?? 'left',
                  color: colors.textSecondary,
                },
              ] as any}
            >
              {column.label}
            </Text>
          ))}
        </View>
      ) : null}
      <View>{children}</View>
    </View>
  );
}

type TableCellProps = {
  children: ReactNode;
  flex?: number;
  align?: 'left' | 'right' | 'center';
  muted?: boolean;
};

export function TableCell({ children, flex = 1, align = 'left', muted }: TableCellProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();

  return (
    <View
      style={{
        flex: responsive.isPhone ? undefined : flex,
        width: responsive.isPhone ? '100%' : undefined,
        minWidth: 0,
        alignItems: responsive.isPhone
          ? 'flex-start'
          : align === 'right'
            ? 'flex-end'
            : align === 'center'
              ? 'center'
              : 'flex-start',
      } as any}
    >
      {typeof children === 'string' ? (
        <Text
          style={{
            color: muted ? colors.textSecondary : colors.text,
            fontSize: typography.fontSize[13],
            lineHeight: typography.lineHeight[18],
          } as any}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeLabel: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold as any,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing[10],
  },
  metricCard: {
    flex: 1,
    gap: spacing(1),
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  metricLabel: {
    fontSize: typography.fontSize[12],
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing[10],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  metricValue: {
    fontSize: typography.fontSize[28],
    lineHeight: typography.lineHeight[32],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  metricHint: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  emptyIcon: {
    width: spacing(12),
    height: spacing(12),
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSize[16],
    fontWeight: typography.fontWeight.extraBold as any,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
    textAlign: 'center',
    maxWidth: 420,
  },
  table: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  tableHeaderLabel: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold as any,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing[10],
  },
  tableRow: {
    borderBottomWidth: 1,
  },
});
