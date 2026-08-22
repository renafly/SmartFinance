import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/data-surface';
import { formatCurrency } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsiveMetrics } from '@/theme/responsive';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';

import type { BalanceForecast } from '../services/balance-forecast.service';
import {
  FORECAST_PERIOD_OPTIONS,
  formatForecastMonth,
  getBiggestForecastChangeIndex,
  getForecastBalanceExtent,
  getForecastBarHeightPercent,
  getForecastMonthPercentChange,
  getForecastTypeColor,
  type ForecastBreakdownTypeGroup,
  type ForecastPeriodMonths,
} from '../ui-utils';

type ForecastBreakdownPreviewProps = {
  combined: BalanceForecast;
  typeGroups: ForecastBreakdownTypeGroup[];
  hasMultipleOwners: boolean;
  periodMonths: ForecastPeriodMonths;
  onChangePeriod: (period: ForecastPeriodMonths) => void;
};

// Redesigned month list: a compact, always-scannable row per month (name +
// total balance + variation, one line) with everything else tucked behind
// progressive disclosure — tap a month to reveal its account-type summary,
// tap a type to reveal its individual accounts. Only one month is open at a
// time (an accordion, not N independent toggles), so the list never grows
// into the "every level always expanded" wall of boxes the old design had.
// The nearest month starts open so the headline numbers are visible with
// zero taps; everything past that is one tap away.
function formatSignedMoney(value: number, money: (value: number) => string) {
  return `${value >= 0 ? '+' : ''}${money(value)}`;
}

function formatPercent(value: number | null) {
  if (value === null) return null;
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function ForecastBreakdownPreview({ combined, typeGroups, hasMultipleOwners, periodMonths, onChangePeriod }: ForecastBreakdownPreviewProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const styles = createStyles(colors);
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const money = (value: number) => displayCurrency(formatCurrency(value), hideValues);

  const timeline = combined.timeline.slice(0, periodMonths);
  const monthKeys = timeline.map((item, index) => item.month || `index-${index}`);
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(monthKeys[0] ?? null);
  const [expandedTypeKeys, setExpandedTypeKeys] = useState<Set<string>>(new Set());

  function toggleMonth(key: string) {
    setExpandedMonthKey((current) => (current === key ? null : key));
  }

  function toggleType(key: string) {
    setExpandedTypeKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const hasMovements = timeline.some((item) => item.movement !== 0);
  const extent = getForecastBalanceExtent(timeline);
  const movementTone = combined.monthlyMovement >= 0 ? colors.success : colors.destructive;
  const biggestChangeIndex = getBiggestForecastChangeIndex(timeline);
  const columnWidth = responsive.isPhone ? '100%' : '47%';

  return (
    <View style={styles.panel}>
      <View style={styles.heroRow}>
        <View style={styles.heroCell}>
          <Text style={styles.heroLabel}>{t('forecast.currentBalance')}</Text>
          <Text style={styles.heroValue}>{money(combined.currentBalance)}</Text>
        </View>
        <View style={[styles.heroCell, { alignItems: 'flex-end' }]}>
          <Text style={styles.heroLabel}>{t('forecast.expectedMonthly')}</Text>
          <Text style={[styles.heroValue, { color: movementTone }]}>{formatSignedMoney(combined.monthlyMovement, money)}</Text>
        </View>
      </View>

      {!hasMovements ? (
        <Text style={styles.emptyText}>{t('forecast.noMovements')}</Text>
      ) : (
        <>
          <View style={styles.periodRow}>
            {FORECAST_PERIOD_OPTIONS.map((option) => (
              <SegmentPill
                key={option}
                label={t('forecast.periodMonthsShort', { count: option })}
                active={periodMonths === option}
                onPress={() => onChangePeriod(option)}
                styles={styles}
              />
            ))}
          </View>

          <View style={styles.trend} accessibilityLabel={t('forecast.chartLabel')}>
            {timeline.map((item, index) => {
              const key = monthKeys[index];
              return (
                <Pressable key={key} onPress={() => setExpandedMonthKey(key)} style={styles.trendColumn}>
                  <View style={styles.trendTrack}>
                    <View
                      style={[
                        styles.trendBar,
                        {
                          height: `${getForecastBarHeightPercent(item.balance, extent)}%`,
                          backgroundColor: expandedMonthKey === key ? colors.primary : item.balance >= 0 ? colors.financialPositive : colors.destructive,
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.trendEdgeLabels}>
            <Text style={styles.trendEdgeLabel}>{formatForecastMonth(timeline[0]?.month)}</Text>
            {timeline.length > 1 ? <Text style={styles.trendEdgeLabel}>{formatForecastMonth(timeline[timeline.length - 1]?.month)}</Text> : null}
          </View>

          <View style={styles.monthList}>
            {timeline.map((monthItem, monthIndex) => {
              const monthKey = monthKeys[monthIndex];
              const isOpen = expandedMonthKey === monthKey;
              const isBiggest = monthIndex === biggestChangeIndex;
              const monthTone = monthItem.movement >= 0 ? colors.success : colors.destructive;
              const percent = formatPercent(getForecastMonthPercentChange(monthItem));

              return (
                <View key={monthKey} style={styles.monthBlock}>
                  <Pressable
                    onPress={() => toggleMonth(monthKey)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    style={({ pressed }) => [styles.monthRow, isOpen && styles.monthRowActive, pressed && styles.pressed]}
                  >
                    <View style={styles.monthRowLeft}>
                      <Text style={styles.chevron}>{isOpen ? '▾' : '▸'}</Text>
                      <Text style={styles.monthName} numberOfLines={1}>
                        {formatForecastMonth(monthItem.month)}
                      </Text>
                      {isBiggest ? <Badge label={t('forecast.biggestChange')} tone="warning" /> : null}
                    </View>
                    <View style={styles.monthRowRight}>
                      <Text style={styles.monthBalance}>{money(monthItem.balance)}</Text>
                      <Text style={[styles.monthVariation, { color: monthTone }]}>
                        {formatSignedMoney(monthItem.movement, money)}
                        {percent ? ` · ${percent}` : ''}
                      </Text>
                    </View>
                  </Pressable>

                  {isOpen ? (
                    <View style={styles.typeList}>
                      {typeGroups.map((typeGroup) => {
                        const typeItem = typeGroup.timeline[monthIndex];
                        const typeKey = `${monthKey}|${typeGroup.key}`;
                        const typeOpen = expandedTypeKeys.has(typeKey);
                        const typeTone = (typeItem?.movement ?? 0) >= 0 ? colors.success : colors.destructive;

                        return (
                          <View key={typeGroup.key} style={{ width: columnWidth }}>
                            <Pressable
                              onPress={() => toggleType(typeKey)}
                              accessibilityRole="button"
                              accessibilityState={{ expanded: typeOpen }}
                              style={({ pressed }) => [styles.typeRow, pressed && styles.pressed]}
                            >
                              <View style={styles.typeRowLeft}>
                                <View style={[styles.typeDot, { backgroundColor: getForecastTypeColor(colors, typeGroup.key) }]} />
                                <Text style={styles.typeLabel} numberOfLines={1}>
                                  {typeGroup.label}
                                </Text>
                              </View>
                              <View style={styles.typeRowRight}>
                                <Text style={styles.typeBalance}>{money(typeItem?.balance ?? 0)}</Text>
                                <Text style={[styles.typeVariation, { color: typeTone }]}>{formatSignedMoney(typeItem?.movement ?? 0, money)}</Text>
                                <Text style={styles.chevronSmall}>{typeOpen ? '▾' : '▸'}</Text>
                              </View>
                            </Pressable>

                            {typeOpen ? (
                              <View style={styles.accountList}>
                                {typeGroup.accounts.map((account) => {
                                  const accountItem = account.timeline[monthIndex];
                                  const accountTone = (accountItem?.movement ?? 0) >= 0 ? colors.success : colors.destructive;

                                  return (
                                    <View key={account.key} style={styles.accountRow}>
                                      <View style={styles.accountRowLeft}>
                                        <Text style={styles.accountName} numberOfLines={1}>
                                          {account.label}
                                        </Text>
                                        {hasMultipleOwners ? (
                                          <Text style={styles.accountOwner} numberOfLines={1}>
                                            {account.ownerLabel}
                                          </Text>
                                        ) : null}
                                      </View>
                                      <View style={styles.accountRowRight}>
                                        <Text style={styles.accountBalance}>{money(accountItem?.balance ?? 0)}</Text>
                                        <Text style={[styles.accountVariation, { color: accountTone }]}>
                                          {formatSignedMoney(accountItem?.movement ?? 0, money)}
                                        </Text>
                                      </View>
                                    </View>
                                  );
                                })}
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

type SegmentPillProps = { label: string; active: boolean; onPress: () => void; styles: ReturnType<typeof createStyles> };

function SegmentPill({ label, active, onPress, styles }: SegmentPillProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.periodPill, active && styles.periodPillActive, pressed && styles.pressed]}
    >
      <Text style={active ? styles.periodPillTextActive : styles.periodPillText}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    panel: { gap: spacing(3) },
    heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    heroCell: { gap: spacing(0.5) },
    heroLabel: { color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold },
    heroValue: { color: colors.text, fontSize: typography.fontSize[22], fontWeight: typography.fontWeight.extraBold, fontVariant: ['tabular-nums'] },
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
    trend: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing(0.75),
      height: spacing(10),
    },
    trendColumn: { flex: 1, height: '100%', justifyContent: 'flex-end' },
    trendTrack: { flex: 1, justifyContent: 'flex-end' },
    trendBar: { width: '100%', minHeight: spacing(0.5), borderRadius: radius.sm },
    trendEdgeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    trendEdgeLabel: { color: colors.textSecondary, fontSize: typography.fontSize[11] },
    monthList: { gap: 0 },
    monthBlock: { borderBottomWidth: 1, borderBottomColor: colors.border },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing(2),
      paddingVertical: spacing(2.5),
    },
    monthRowActive: { backgroundColor: colors.surfaceMuted, marginHorizontal: -spacing(2), paddingHorizontal: spacing(2), borderRadius: radius.md },
    monthRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), flex: 1, minWidth: 0 },
    chevron: { width: spacing(3.5), color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold },
    monthName: { color: colors.text, fontSize: typography.fontSize[15], fontWeight: typography.fontWeight.extraBold, flexShrink: 1 },
    monthRowRight: { alignItems: 'flex-end', gap: spacing(0.25) },
    monthBalance: { color: colors.text, fontSize: typography.fontSize[16], fontWeight: typography.fontWeight.extraBold, fontVariant: ['tabular-nums'] },
    monthVariation: { fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold, fontVariant: ['tabular-nums'] },
    typeList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingBottom: spacing(2.5),
      paddingLeft: spacing(5),
      rowGap: spacing(0.5),
      columnGap: spacing(2),
    },
    typeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing(1.5),
      paddingVertical: spacing(1.5),
      paddingRight: spacing(3),
    },
    typeRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), flex: 1, minWidth: 0 },
    typeDot: { width: spacing(2), height: spacing(2), borderRadius: radius.full },
    typeLabel: { color: colors.text, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.bold, flexShrink: 1 },
    typeRowRight: { flexDirection: 'row', alignItems: 'baseline', gap: spacing(1.5) },
    typeBalance: { color: colors.text, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.extraBold, fontVariant: ['tabular-nums'] },
    typeVariation: { fontSize: typography.fontSize[11], fontWeight: typography.fontWeight.semibold, fontVariant: ['tabular-nums'] },
    chevronSmall: { color: colors.textSecondary, fontSize: typography.fontSize[11], fontWeight: typography.fontWeight.bold },
    accountList: { paddingLeft: spacing(3.5), paddingBottom: spacing(1) },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing(1.5),
      paddingVertical: spacing(1.25),
    },
    accountRowLeft: { flex: 1, minWidth: 0 },
    accountName: { color: colors.text, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold },
    accountOwner: { color: colors.textSecondary, fontSize: typography.fontSize[11] },
    accountRowRight: { alignItems: 'flex-end' },
    accountBalance: { color: colors.text, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold, fontVariant: ['tabular-nums'] },
    accountVariation: { fontSize: typography.fontSize[11], fontWeight: typography.fontWeight.semibold, fontVariant: ['tabular-nums'] },
    pressed: { opacity: 0.85 },
  });
}
