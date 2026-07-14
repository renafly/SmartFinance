import { Ionicons } from '@expo/vector-icons';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type ReactNode,
} from 'react';
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
          width: responsive.isPhone ? '100%' : undefined,
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

const TableColumnsContext = createContext<TableColumn[]>([]);

type TableRowProps = {
  children: ReactNode;
  onPress?: () => void;
};

export function TableRow({ children, onPress }: TableRowProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const columns = useContext(TableColumnsContext);
  const rowChildren = responsive.isPhone
    ? Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;

        return cloneElement(child as any, {
          mobileLabel: columns[index]?.label,
          mobileColumnIndex: index,
        });
      })
    : children;

  const RowComponent = onPress ? Pressable : View;

  return (
    <RowComponent
      {...(onPress ? { onPress, accessibilityRole: 'button' as const } : {})}
      style={[
        styles.tableRow,
        {
          borderBottomColor: colors.border,
          flexDirection: responsive.isPhone ? 'column' : 'row',
          alignItems: responsive.isPhone ? 'stretch' : 'center',
          gap: responsive.tableCellGap,
          paddingHorizontal: responsive.isPhone ? spacing(2.5) : spacing(3),
          paddingVertical: responsive.isPhone ? spacing(2.25) : spacing(2.5),
          backgroundColor: responsive.isPhone ? colors.surface : undefined,
          borderColor: responsive.isPhone ? colors.border : undefined,
          borderWidth: responsive.isPhone ? 1 : undefined,
          borderRadius: responsive.isPhone ? radius.lg : undefined,
          marginBottom: responsive.isPhone ? spacing(2) : 0,
        },
        onPress ? styles.tableRowPressable : null,
      ] as any}
    >
      {rowChildren}
    </RowComponent>
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
    <TableColumnsContext.Provider value={columns}>
      <View
        style={[
          styles.table,
          {
            backgroundColor: responsive.isPhone ? 'transparent' : colors.surfaceMuted,
            borderColor: responsive.isPhone ? 'transparent' : colors.border,
          },
        ] as any}
      >
        {!responsive.isPhone ? (
          <View style={[styles.tableHeader, { backgroundColor: colors.surface, borderColor: colors.border }] as any}>
            {columns.map((column, index) => (
              <Text
                key={`${column.label}-${index}`}
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
        <View style={styles.tableBody}>{children}</View>
      </View>
    </TableColumnsContext.Provider>
  );
}

type TableCellProps = {
  children: ReactNode;
  flex?: number;
  align?: 'left' | 'right' | 'center';
  muted?: boolean;
  mobileLabel?: string;
  mobileColumnIndex?: number;
  mobilePinned?: boolean;
};

export function TableCell({
  children,
  flex = 1,
  align = 'left',
  muted,
  mobileLabel,
  mobileColumnIndex,
  mobilePinned,
}: TableCellProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const isMobileTopRightCell =
    responsive.isPhone &&
    mobilePinned === true &&
    align === 'right';
  const isMobileFirstCell = responsive.isPhone && mobileColumnIndex === 0;
  const isMobileLabeledRow = responsive.isPhone && !isMobileTopRightCell && !isMobileFirstCell;
  const content = typeof children === 'string' ? (
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
  );

  return (
    <View
      style={{
        flex: responsive.isPhone ? undefined : flex,
        width: responsive.isPhone && !isMobileTopRightCell ? '100%' : undefined,
        alignSelf: responsive.isPhone ? 'stretch' : undefined,
        minWidth: 0,
        flexDirection: isMobileLabeledRow ? 'row' : 'column',
        justifyContent: isMobileLabeledRow ? 'space-between' : 'flex-start',
        alignItems: isMobileTopRightCell
          ? 'flex-end'
          : isMobileLabeledRow
            ? 'center'
            : responsive.isPhone
              ? 'stretch'
              : align === 'right'
                ? 'flex-end'
                : align === 'center'
                  ? 'center'
                  : 'flex-start',
        gap: responsive.isPhone ? spacing(1) : 0,
        ...(isMobileTopRightCell
          ? {
              position: 'absolute',
              top: spacing(2.25),
              right: spacing(2.5),
              maxWidth: spacing(18),
              zIndex: 2,
            }
          : null),
      } as any}
    >
      {responsive.isPhone && mobileLabel && !isMobileTopRightCell ? (
        <Text style={[styles.mobileCellLabel, { color: colors.textSecondary }]}>{mobileLabel}</Text>
      ) : null}
      {isMobileLabeledRow ? (
        <View style={styles.mobileCellValue}>{content}</View>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
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
    alignSelf: 'stretch',
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
    width: '100%',
    alignSelf: 'stretch',
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
    width: '100%',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  tableHeader: {
    width: '100%',
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
    width: '100%',
    alignSelf: 'stretch',
    borderBottomWidth: 1,
  },
  tableRowPressable: {
    cursor: 'pointer' as any,
  },
  tableBody: {
    width: '100%',
    alignSelf: 'stretch',
  },
  mobileCellLabel: {
    flexShrink: 0,
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
    fontWeight: typography.fontWeight.extraBold as any,
    letterSpacing: typography.letterSpacing[10],
    textTransform: 'uppercase',
  },
  mobileCellValue: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
});
