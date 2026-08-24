import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCurrency } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';

import type { BalanceForecast, BalanceForecastSourceKind } from '../services/balance-forecast.service';
import {
  FORECAST_PERIOD_OPTIONS,
  buildForecastYearRows,
  formatForecastMonth,
  getForecastBalanceExtent,
  getForecastBarHeightPercent,
  type ForecastPeriodMonths,
} from '../ui-utils';

export type ForecastViewMode = 'monthly' | 'yearly';

type BalanceForecastPanelProps = {
  forecast: BalanceForecast | null | undefined;
  periodMonths: ForecastPeriodMonths;
  onChangePeriod: (period: ForecastPeriodMonths) => void;
  viewMode: ForecastViewMode;
  onChangeViewMode: (mode: ForecastViewMode) => void;
};

const SOURCE_LABEL_KEYS: Record<BalanceForecastSourceKind, string> = {
  recurring_income: 'forecast.sourceRecurringIncome',
  recurring_expense: 'forecast.sourceRecurringExpense',
  recurring_transfer: 'forecast.sourceRecurringTransfer',
  monthly_budget: 'forecast.sourceMonthlyBudget',
};

export function BalanceForecastPanel({
  forecast,
  periodMonths,
  onChangePeriod,
  viewMode,
  onChangeViewMode,
}: BalanceForecastPanelProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const money = (value: number | string | null | undefined) => displayCurrency(formatCurrency(value), hideValues);

  const timeline = (forecast?.timeline ?? []).slice(0, periodMonths);
  const hasMovements = timeline.some((item) => item.movement !== 0);
  const extent = getForecastBalanceExtent(timeline);
  const yearRows = buildForecastYearRows(timeline);
  const movementTone = (forecast?.monthlyMovement ?? 0) >= 0 ? colors.success : colors.destructive;

  return (
    <View style={styles.panel}>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>{t('forecast.currentBalance')}</Text>
          <Text style={styles.summaryValue}>{money(forecast?.currentBalance ?? 0)}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>{t('forecast.expectedMonthly')}</Text>
          <Text style={[styles.summaryValue, { color: movementTone }]}>
            {(forecast?.monthlyMovement ?? 0) >= 0 ? '+' : ''}
            {money(forecast?.monthlyMovement ?? 0)}
          </Text>
        </View>
      </View>

      {forecast && forecast.sources.length > 0 ? (
        <View style={{ gap: spacing(0.5) }}>
          {forecast.sources.map((source) => (
            <Text key={source.kind} style={styles.sourceText}>
              {t(SOURCE_LABEL_KEYS[source.kind], {
                value: `${source.monthlyMovement >= 0 ? '+' : ''}${money(source.monthlyMovement)}`,
              })}
            </Text>
          ))}
        </View>
      ) : null}

      {!hasMovements ? (
        <Text style={styles.emptyText}>{t('forecast.noMovements')}</Text>
      ) : (
        <>
          <View style={styles.periodRow}>
            {FORECAST_PERIOD_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => onChangePeriod(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: periodMonths === option }}
                style={({ pressed }) => [
                  styles.periodPill,
                  periodMonths === option && styles.periodPillActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={periodMonths === option ? styles.periodPillTextActive : styles.periodPillText}>
                  {t('forecast.periodMonthsShort', { count: option })}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.chart} accessibilityLabel={t('forecast.chartLabel')}>
            {timeline.map((item) => (
              <View key={item.month} style={styles.chartColumn}>
                <View style={styles.chartTrack}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: `${getForecastBarHeightPercent(item.balance, extent)}%`,
                        backgroundColor: item.balance >= 0 ? colors.financialPositive : colors.destructive,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel} numberOfLines={1}>
                  {formatForecastMonth(item.month).split(' ')[0]}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.viewToggle}>
            {(['monthly', 'yearly'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => onChangeViewMode(mode)}
                accessibilityRole="button"
                accessibilityState={{ selected: viewMode === mode }}
                style={({ pressed }) => [
                  styles.viewToggleButton,
                  viewMode === mode && styles.viewToggleButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={viewMode === mode ? styles.viewToggleTextActive : styles.viewToggleText}>
                  {mode === 'monthly' ? t('savings.forecastMonthlyView') : t('savings.forecastYearlyView')}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.columnLabels}>
            <Text style={[styles.columnLabel, styles.columnLabelPrimary]}>
              {viewMode === 'monthly' ? t('forecast.monthColumn') : t('savings.forecastYear')}
            </Text>
            <Text style={styles.columnLabel}>{t('forecast.movementColumn')}</Text>
            <Text style={styles.columnLabel}>{t('forecast.balanceColumn')}</Text>
          </View>

          <View style={{ gap: spacing(1) }}>
            {(viewMode === 'monthly'
              ? timeline.map((item) => ({ key: item.month, label: formatForecastMonth(item.month), movement: item.movement, balance: item.balance }))
              : yearRows.map((item) => ({ key: item.year, label: item.year, movement: item.movement, balance: item.balance }))
            ).map((row) => (
              <View key={row.key} style={styles.row}>
                <Text style={[styles.rowText, styles.columnLabelPrimary]}>{row.label}</Text>
                <Text style={[styles.rowText, { color: row.movement >= 0 ? colors.success : colors.destructive }]}>
                  {row.movement >= 0 ? '+' : ''}
                  {money(row.movement)}
                </Text>
                <Text style={styles.rowBalance}>{money(row.balance)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    panel: { gap: spacing(2.5) },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
    summaryCell: {
      flexGrow: 1,
      minWidth: spacing(28),
      gap: spacing(0.5),
      padding: spacing(2.5),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryLabel: { color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold },
    summaryValue: { color: colors.text, fontSize: typography.fontSize[18], fontWeight: typography.fontWeight.extraBold },
    sourceText: { color: colors.textSecondary, fontSize: typography.fontSize[12], lineHeight: typography.lineHeight[17] },
    emptyText: { color: colors.textSecondary, fontSize: typography.fontSize[13], lineHeight: typography.lineHeight[18] },
    periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) },
    periodPill: {
      paddingHorizontal: spacing(2.5),
      paddingVertical: spacing(1.25),
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    periodPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    periodPillText: { color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold },
    periodPillTextActive: { color: colors.primaryForeground, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold },
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing(1),
      height: spacing(24),
      padding: spacing(2),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chartColumn: { flex: 1, alignItems: 'center', gap: spacing(1), height: '100%' },
    chartTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    chartBar: { width: '60%', minHeight: spacing(0.5), borderRadius: radius.sm },
    chartLabel: { color: colors.textSecondary, fontSize: typography.fontSize[12] },
    viewToggle: { flexDirection: 'row', alignSelf: 'flex-start', borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    viewToggleButton: { paddingHorizontal: spacing(2), paddingVertical: spacing(1) },
    viewToggleButtonActive: { backgroundColor: colors.primary },
    viewToggleText: { color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold },
    viewToggleTextActive: { color: colors.primaryForeground, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold },
    columnLabels: { flexDirection: 'row', gap: spacing(1), paddingHorizontal: spacing(2) },
    columnLabel: { flex: 1, color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold, textAlign: 'right', textTransform: 'uppercase' },
    columnLabelPrimary: { flex: 1.25, textAlign: 'left' },
    row: { flexDirection: 'row', gap: spacing(1), paddingHorizontal: spacing(2), paddingVertical: spacing(1.5), borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
    rowText: { flex: 1, color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold, textAlign: 'right' },
    rowBalance: { flex: 1, color: colors.text, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.extraBold, textAlign: 'right' },
    pressed: { opacity: 0.85 },
  });
}
