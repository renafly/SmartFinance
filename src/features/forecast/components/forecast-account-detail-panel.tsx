import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import type { BalanceForecastTimelineItem } from '../services/balance-forecast.service';
import { formatForecastMonth, getForecastMonthPercentChange, type ForecastPeriodMonths } from '../ui-utils';

function formatSignedMoney(value: number, money: (value: number) => string) {
  return `${value >= 0 ? '+' : ''}${money(value)}`;
}

export type AccountDetailPanelAccount = {
  key: string;
  label: string;
  /** Caller-composed subtitle — "Owner · Type" for an individual account, "{{count}} accounts" for a whole account-type rollup. Omitted entirely when there's nothing meaningful to show. */
  subtitle?: string;
  currentBalance: number;
  color: string;
  timeline: BalanceForecastTimelineItem[];
};

type AccountDetailPanelProps = {
  account: AccountDetailPanelAccount;
  periodMonths: ForecastPeriodMonths;
  money: (value: number) => string;
  onClose: () => void;
  colors: any;
};

// The "why is this account moving" readout opened by selecting a single
// account line/point on the Graph. Deliberately scoped to individual
// accounts only — a Type/User/Total aggregate doesn't have a single owner
// or a single "current balance" to anchor a breakdown against, so those
// levels get a compact tooltip instead (see ForecastGraphView). Reuses the
// same hairline-row list language as ForecastBreakdownPreview's month rows
// rather than a literal table component, so it reads as part of the same
// row family instead of a bolted-on admin grid.
export function AccountDetailPanel({ account, periodMonths, money, onClose, colors }: AccountDetailPanelProps) {
  const { t } = useTranslation('common');
  const styles = createStyles(colors);

  const timeline = account.timeline.slice(0, periodMonths);
  const projectedBalance = timeline.length > 0 ? timeline[timeline.length - 1].balance : account.currentBalance;
  const totalVariation = projectedBalance - account.currentBalance;
  const variationTone = totalVariation >= 0 ? colors.success : colors.destructive;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <View style={[styles.dot, { backgroundColor: account.color }]} />
            <Text style={styles.title} numberOfLines={1}>
              {account.label}
            </Text>
          </View>
          {account.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {account.subtitle}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('close')} style={styles.closeButton}>
          <Ionicons name="close-outline" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>{t('forecast.currentBalance')}</Text>
          <Text style={styles.summaryValue}>{money(account.currentBalance)}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>{t('forecast.periodForecastLabel', { count: periodMonths })}</Text>
          <Text style={styles.summaryValue}>{money(projectedBalance)}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>{t('forecast.expectedChangeLabel')}</Text>
          <Text style={[styles.summaryValue, { color: variationTone }]}>{formatSignedMoney(totalVariation, money)}</Text>
        </View>
      </View>

      <View style={styles.monthList}>
        {timeline.map((item, index) => {
          const tone = item.movement >= 0 ? colors.success : colors.destructive;
          const percent = getForecastMonthPercentChange(item);

          return (
            <View key={item.month || index} style={[styles.monthRow, index === timeline.length - 1 && styles.monthRowLast]}>
              <Text style={styles.monthName} numberOfLines={1}>
                {formatForecastMonth(item.month)}
              </Text>
              <View style={styles.monthValues}>
                <Text style={[styles.monthChange, { color: tone }]}>
                  {formatSignedMoney(item.movement, money)}
                  {percent !== null ? ` · ${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%` : ''}
                </Text>
                <Text style={styles.monthBalance}>{money(item.balance)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    panel: { gap: spacing(3) },
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing(2) },
    headerText: { flex: 1, minWidth: 0, gap: spacing(0.5) },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
    dot: { width: 8, height: 8, borderRadius: 4 },
    title: { color: colors.text, fontSize: typography.fontSize[15], fontWeight: typography.fontWeight.extraBold, flexShrink: 1 },
    subtitle: { color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold },
    closeButton: {
      width: spacing(6),
      height: spacing(6),
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) },
    summaryCell: { gap: spacing(0.5), minWidth: spacing(24) },
    summaryLabel: { color: colors.textSecondary, fontSize: typography.fontSize[11], fontWeight: typography.fontWeight.semibold },
    summaryValue: { color: colors.text, fontSize: typography.fontSize[16], fontWeight: typography.fontWeight.extraBold, fontVariant: ['tabular-nums'] },
    monthList: { gap: 0 },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing(2),
      paddingVertical: spacing(1.5),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    monthRowLast: { borderBottomWidth: 0 },
    monthName: { color: colors.text, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold },
    monthValues: { flexDirection: 'row', alignItems: 'baseline', gap: spacing(2) },
    monthChange: { fontSize: typography.fontSize[11], fontWeight: typography.fontWeight.semibold, fontVariant: ['tabular-nums'] },
    monthBalance: { color: colors.text, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold, fontVariant: ['tabular-nums'] },
  });
}
