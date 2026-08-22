import { useEffect, useId, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { formatCurrency } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsiveMetrics } from '@/theme/responsive';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';

import type { BalanceForecastTimelineItem } from '../services/balance-forecast.service';
import {
  FORECAST_PERIOD_OPTIONS,
  formatForecastMonth,
  getForecastMonthPercentChange,
  getForecastSeriesColor,
  type ForecastNormalizedData,
  type ForecastPeriodMonths,
} from '../ui-utils';
import { AccountDetailPanel, type AccountDetailPanelAccount } from './forecast-account-detail-panel';

// See react-native-svg's web shim note in insight-charts.tsx — only relevant
// when a press handler sits directly on an <Svg>/<Path> element. Here the
// whole chart is wrapped in a plain RN Pressable instead (so we get
// locationX/locationY for free on every platform), so that workaround isn't
// needed.

type GraphLevel = 'account' | 'type' | 'owner' | 'total';
type GraphMetric = 'balance' | 'change';

type GraphSeries = {
  key: string;
  label: string;
  /** Shown next to the name in the legend/tooltip — the owner, for account-level series. Always set at the account level per the "always show ownership" requirement. */
  subLabel?: string;
  /** Account-level only — feeds the account detail panel. */
  ownerLabel?: string;
  typeLabel?: string;
  currentBalance?: number;
  color: string;
  timeline: BalanceForecastTimelineItem[];
};

type TypeSection = { key: string; label: string; seriesKeys: string[] };

// Every rendered line gets a color from the same rotating, guaranteed-
// distinct palette regardless of level — a semantic per-type color (as the
// List view's dots use) reads fine there because a dot always sits right
// next to its own text label, but two overlapping SVG lines with the same
// hue (e.g. a Pot and a Credit Card, which shared an "attention" color in
// an earlier version of this chart) become impossible to tell apart. The
// List view keeps its semantic colors; only this chart uses the rotation.
function buildSeries(normalized: ForecastNormalizedData, level: GraphLevel, colors: any, totalLabel: string): GraphSeries[] {
  if (level === 'total') {
    return [{ key: '__total__', label: totalLabel, color: colors.primary, timeline: normalized.combined.timeline }];
  }
  if (level === 'type') {
    return normalized.types.map((group, index) => ({
      key: group.key,
      label: group.label,
      color: getForecastSeriesColor(colors, index),
      timeline: group.timeline,
    }));
  }
  if (level === 'owner') {
    return normalized.owners.map((group, index) => ({
      key: group.key,
      label: group.label,
      color: getForecastSeriesColor(colors, index),
      timeline: group.timeline,
    }));
  }
  return normalized.accounts.map((account, index) => ({
    key: account.key,
    label: account.label,
    // Always shown at the account level — a Series Selector entry with no
    // owner caption is exactly what this round's spec called out as
    // ambiguous ("always include the owner/user name beside the account
    // name"), so unlike the List view this isn't gated on hasMultipleOwners.
    subLabel: account.ownerLabel,
    ownerLabel: account.ownerLabel,
    typeLabel: account.typeLabel,
    currentBalance: account.currentBalance,
    color: getForecastSeriesColor(colors, index),
    timeline: account.timeline,
  }));
}

function formatSignedMoney(value: number, money: (value: number) => string) {
  return `${value >= 0 ? '+' : ''}${money(value)}`;
}

function formatPercent(value: number | null) {
  if (value === null) return null;
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

const CHART_HEIGHT = 180;
const PAD_TOP = 20;
const PAD_BOTTOM = 10;
const PAD_SIDE = 4;
const PLOT_HEIGHT = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
/** Below this many series, there's no point collapsing the row list on phone — a handful of rows is already scannable. */
const COLLAPSE_THRESHOLD = 4;
/** Tap-to-select hit radius (px) around a series' point, for choosing a line/point on the chart vs. just moving the shared month crosshair. */
const POINT_HIT_RADIUS = 28;

function useChartWidth() {
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const fallbackWidth = Math.max(200, Math.min(900, windowWidth - spacing(10)));

  return {
    width: measuredWidth || fallbackWidth,
    onLayout: (event: { nativeEvent: { layout: { width: number } } }) => {
      const nextWidth = Math.max(1, Math.floor(event.nativeEvent.layout.width));
      setMeasuredWidth((current) => (current === nextWidth ? current : nextWidth));
    },
  };
}

function xFor(index: number, count: number, plotWidth: number) {
  if (count <= 1) return PAD_SIDE + plotWidth / 2;
  return PAD_SIDE + (index / (count - 1)) * plotWidth;
}

function yFor(value: number, min: number, max: number) {
  const range = max - min || 1;
  return PAD_TOP + (1 - (value - min) / range) * PLOT_HEIGHT;
}

function seriesValueAt(series: GraphSeries, index: number, metric: GraphMetric): number | null {
  const item = series.timeline[index];
  if (!item) return null;
  return metric === 'balance' ? item.balance : item.movement;
}

function buildLinePath(series: GraphSeries, count: number, plotWidth: number, min: number, max: number, metric: GraphMetric) {
  let d = '';
  for (let index = 0; index < count; index += 1) {
    const value = seriesValueAt(series, index, metric);
    if (value === null) continue;
    const x = xFor(index, count, plotWidth);
    const y = yFor(value, min, max);
    d += `${d === '' ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d.trim();
}

/** Closed "silhouette" path under a single line, down to the plot's bottom edge — only drawn for the one spotlighted/sole-visible line, so overlapping fills never muddy a multi-line comparison. */
function buildAreaPath(series: GraphSeries, count: number, plotWidth: number, min: number, max: number, metric: GraphMetric) {
  const bottomY = CHART_HEIGHT - PAD_BOTTOM;
  const points: { x: number; y: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    const value = seriesValueAt(series, index, metric);
    if (value === null) continue;
    points.push({ x: xFor(index, count, plotWidth), y: yFor(value, min, max) });
  }
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `M ${first.x} ${bottomY} ${points.map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${last.x} ${bottomY} Z`;
}

type ForecastGraphViewProps = {
  normalized: ForecastNormalizedData;
  periodMonths: ForecastPeriodMonths;
  onChangePeriod: (period: ForecastPeriodMonths) => void;
};

// Graph presentation for the exact same normalized forecast data the List
// view renders (see buildForecastNormalizedData in ui-utils.ts) — this
// component never recomputes balances or movements itself, it only picks
// an aggregation level (Account/Type/User/Total) and a metric
// (Balance/Monthly change) and lays the resulting series out as lines.
//
// Three distinct pieces of state matter here, and they're kept genuinely
// separate per this round's spec:
//   - "Included in forecast" — normalized.accounts itself (owned by
//     CombinedForecastPanel, shared with the List view).
//   - "Visible on graph" — hiddenKeys below (which lines are drawn/counted
//     at all).
//   - "Currently selected for details" — highlightedKey below (which line
//     is emphasized and which account detail panel/tooltip is open). This
//     never removes a line from the chart, it only dims the others.
export function ForecastGraphView({ normalized, periodMonths, onChangePeriod }: ForecastGraphViewProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const styles = createStyles(colors);
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const money = (value: number) => displayCurrency(formatCurrency(value), hideValues);
  const { width: chartWidth, onLayout: onChartLayout } = useChartWidth();
  const gradientId = useId();

  const [level, setLevel] = useState<GraphLevel>('account');
  const [metric, setMetric] = useState<GraphMetric>('balance');
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  // Selecting a whole account type from the Account-level series selector
  // (as opposed to one specific account) — kept separate from
  // highlightedKey because at the Account level a type isn't itself one of
  // the chart's lines, so it needs its own key namespace (normalized.types
  // keys) and its own "which lines does this dim" resolution below.
  const [highlightedGroupKey, setHighlightedGroupKey] = useState<string | null>(null);
  const [rowsExpanded, setRowsExpanded] = useState(!responsive.isPhone);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);

  const canonicalTimeline = normalized.combined.timeline.slice(0, periodMonths);
  const pointCount = canonicalTimeline.length;
  const clampedMonthIndex = Math.min(selectedMonthIndex, Math.max(0, pointCount - 1));
  const hasMovements = canonicalTimeline.some((item) => item.movement !== 0);

  const allSeries = useMemo(() => buildSeries(normalized, level, colors, t('forecast.totalSeriesLabel')), [normalized, level, colors, t]);
  const hasMultipleSeries = allSeries.length > 1;

  // Grouping the account-level selector by type — Bank Accounts, Savings,
  // Pots, ... — so it never becomes one very long flat legend.
  const typeSections = useMemo<TypeSection[] | null>(() => {
    if (level !== 'account') return null;
    return normalized.types.map((group) => ({ key: group.key, label: group.label, seriesKeys: group.accounts.map((account) => account.key) }));
  }, [level, normalized.types]);

  // Hidden/highlighted keys and the rows-list default collapse state are
  // all per-level (account ids vs. type/owner keys live in different
  // namespaces, and a different level can have a very different series
  // count) — reset them whenever the level changes instead of carrying
  // over a selection that no longer applies there.
  useEffect(() => {
    setHiddenKeys(new Set());
    setHighlightedKey(null);
    setHighlightedGroupKey(null);
    setRowsExpanded(!responsive.isPhone || allSeries.length <= COLLAPSE_THRESHOLD);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // "Visible on graph" — highlighting a line never removes another line
  // from this set, it only changes how it's drawn (see isDimmed below).
  const visibleSeries = allSeries.filter((series) => !hiddenKeys.has(series.key));
  const highlightedSeries = highlightedKey ? (allSeries.find((series) => series.key === highlightedKey && !hiddenKeys.has(series.key)) ?? null) : null;

  // The set of series keys to draw at full emphasis right now — either the
  // one individually-tapped line, or every account belonging to a
  // type selected as a whole from the Account-level selector. `null` means
  // no highlight is active (every line draws at its normal weight).
  const emphasizedKeys = useMemo(() => {
    if (highlightedKey) return new Set([highlightedKey]);
    if (level === 'account' && highlightedGroupKey && typeSections) {
      const group = typeSections.find((section) => section.key === highlightedGroupKey);
      if (group) return new Set(group.seriesKeys);
    }
    return null;
  }, [highlightedKey, highlightedGroupKey, level, typeSections]);

  const extent = useMemo(() => {
    const values = visibleSeries.flatMap((series) =>
      series.timeline.slice(0, pointCount).map((item) => (metric === 'balance' ? item.balance : item.movement)),
    );
    if (values.length === 0) return { min: 0, max: 1 };

    if (metric === 'change') {
      // 0 is the meaningful reference point for gains vs. losses, so it
      // always stays on-axis here.
      const min = Math.min(0, ...values);
      const max = Math.max(0, ...values);
      if (min === max) return { min: min - 1, max: max + 1 };
      const pad = (max - min) * 0.12;
      return { min: min - pad, max: max + pad };
    }

    // Balance: let the data's own range breathe instead of forcing 0 onto
    // the axis. A balance moving between e.g. €4,000-6,000 on a 0-6,000
    // scale gets squeezed into a thin sliver at the top — exactly the
    // opposite of "make it easy to see how this is changing."
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    if (rawMin === rawMax) {
      const cushion = Math.max(1, Math.abs(rawMin) * 0.1);
      return { min: rawMin - cushion, max: rawMax + cushion };
    }
    const pad = (rawMax - rawMin) * 0.12;
    return { min: rawMin - pad, max: rawMax + pad };
  }, [visibleSeries, pointCount, metric]);

  const plotWidth = Math.max(1, chartWidth - PAD_SIDE * 2);
  const zeroY = yFor(0, extent.min, extent.max);
  const showZeroBaseline = extent.min < 0 && extent.max > 0;

  // A spotlighted (highlighted) line always gets the area fill, since it's
  // the one line the user has asked to focus on; failing that, fall back
  // to filling the lone visible line (e.g. Total level, or a selection
  // narrowed to a single series via the eye toggles).
  const areaFillSeries = highlightedSeries ?? (visibleSeries.length === 1 ? visibleSeries[0] : null);
  const showAreaFill = areaFillSeries !== null;

  // Draw emphasized lines last so they render on top of the (dimmed)
  // others.
  const orderedForDraw = emphasizedKeys
    ? [...visibleSeries.filter((series) => !emphasizedKeys.has(series.key)), ...visibleSeries.filter((series) => emphasizedKeys.has(series.key))]
    : visibleSeries;

  function handleChartPress(locationX: number, locationY: number) {
    if (pointCount === 0) return;
    const ratio = Math.min(1, Math.max(0, (locationX - PAD_SIDE) / plotWidth));
    const monthIndex = Math.round(ratio * (pointCount - 1));
    setSelectedMonthIndex(monthIndex);

    // Hit-test the tap against every visible series' point at that month —
    // a hit selects that line (opening/updating the detail panel below); a
    // miss just moves the shared crosshair and leaves any existing
    // selection alone, so scrubbing through months doesn't accidentally
    // close an open detail panel.
    let bestKey: string | null = null;
    let bestDistance = POINT_HIT_RADIUS;
    for (const series of visibleSeries) {
      const value = seriesValueAt(series, monthIndex, metric);
      if (value === null) continue;
      const x = xFor(monthIndex, pointCount, plotWidth);
      const y = yFor(value, extent.min, extent.max);
      const distance = Math.hypot(x - locationX, y - locationY);
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestKey = series.key;
      }
    }
    if (bestKey) {
      const hitKey = bestKey;
      setHighlightedKey((current) => (current === hitKey ? null : hitKey));
    }
  }

  function toggleHidden(key: string) {
    setHiddenKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    if (highlightedKey === key) setHighlightedKey(null);
  }

  function toggleHiddenGroup(keys: string[]) {
    setHiddenKeys((current) => {
      const allHidden = keys.every((key) => current.has(key));
      const next = new Set(current);
      keys.forEach((key) => (allHidden ? next.delete(key) : next.add(key)));
      return next;
    });
    if (highlightedKey && keys.includes(highlightedKey)) setHighlightedKey(null);
    if (highlightedGroupKey) {
      const group = typeSections?.find((section) => section.key === highlightedGroupKey);
      if (group && group.seriesKeys.every((key) => keys.includes(key))) setHighlightedGroupKey(null);
    }
  }

  function toggleHighlight(key: string) {
    setHighlightedKey((current) => (current === key ? null : key));
    setHighlightedGroupKey(null);
  }

  // Selecting an entire account type from the Account-level selector — the
  // detail panel then shows the type's combined current/projected/change
  // and month-by-month breakdown (see activeTypeGroup below), while the
  // chart keeps every account's own line visible, just dimming the ones
  // outside this type instead of collapsing them into one aggregate line.
  function toggleHighlightedGroup(key: string) {
    setHighlightedGroupKey((current) => (current === key ? null : key));
    setHighlightedKey(null);
  }

  function closeDetail() {
    setHighlightedKey(null);
    setHighlightedGroupKey(null);
  }

  function showAll() {
    setHiddenKeys(new Set());
    setHighlightedKey(null);
    setHighlightedGroupKey(null);
  }

  const hasHiddenOrHighlighted = hiddenKeys.size > 0 || highlightedKey !== null || highlightedGroupKey !== null;
  const selectedMonthLabel = canonicalTimeline[clampedMonthIndex] ? formatForecastMonth(canonicalTimeline[clampedMonthIndex].month) : '';

  const levelOptions: { key: GraphLevel; label: string }[] = [
    { key: 'account', label: t('forecast.levelAccount') },
    { key: 'type', label: t('forecast.levelType') },
    { key: 'owner', label: t('forecast.levelUser') },
    { key: 'total', label: t('forecast.levelTotal') },
  ];
  const metricOptions: { key: GraphMetric; label: string }[] = [
    { key: 'balance', label: t('forecast.metricBalance') },
    { key: 'change', label: t('forecast.metricChange') },
  ];

  // The rich detail panel applies at the Account level (one specific
  // account, or — via the selector's type header — a whole type rolled up)
  // and at the Type level (one aggregated type line). User/Total
  // aggregates don't have a single owner or a meaningful "current balance"
  // rollup the same way, so a highlighted line there still gets the
  // compact tooltip instead (see the SingleSeriesDetail usage below). On
  // anything wider than phone the panel reserves a fixed side column so
  // opening it doesn't reflow the chart; on phone it renders inline,
  // directly below the series list.
  const showSideBySideDetail = !responsive.isPhone && (level === 'account' || level === 'type') && hasMultipleSeries;

  // A type selected as a whole — either directly (Group by: Type, one line
  // *is* a type) or indirectly (Group by: Account, the type header was
  // tapped) — resolves to the same normalized.types rollup either way.
  const activeTypeGroupKey = level === 'type' ? highlightedKey : level === 'account' ? highlightedGroupKey : null;
  const activeTypeGroup = activeTypeGroupKey ? (normalized.types.find((group) => group.key === activeTypeGroupKey) ?? null) : null;

  const detailAccount: AccountDetailPanelAccount | null =
    level === 'account' && highlightedSeries
      ? {
          key: highlightedSeries.key,
          label: highlightedSeries.label,
          subtitle: highlightedSeries.ownerLabel && highlightedSeries.typeLabel ? `${highlightedSeries.ownerLabel} · ${highlightedSeries.typeLabel}` : undefined,
          currentBalance: highlightedSeries.currentBalance ?? 0,
          color: highlightedSeries.color,
          timeline: highlightedSeries.timeline,
        }
      : activeTypeGroup
        ? {
            key: activeTypeGroup.key,
            label: activeTypeGroup.label,
            subtitle: t('forecast.accountsCountLabel', { count: activeTypeGroup.accounts.length }),
            currentBalance: activeTypeGroup.accounts.reduce((sum, account) => sum + account.currentBalance, 0),
            color: colors.primary,
            timeline: activeTypeGroup.timeline,
          }
        : null;

  const chartBody = (
    <>
      <Pressable onPress={(event) => handleChartPress(event.nativeEvent.locationX, event.nativeEvent.locationY)} onLayout={onChartLayout}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          {showAreaFill && areaFillSeries ? (
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={areaFillSeries.color} stopOpacity={0.3} />
                <Stop offset="1" stopColor={areaFillSeries.color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
          ) : null}
          {showZeroBaseline ? (
            <Line x1={PAD_SIDE} x2={chartWidth - PAD_SIDE} y1={zeroY} y2={zeroY} stroke={colors.border} strokeWidth={1} strokeDasharray="3,4" />
          ) : null}
          {pointCount > 0 ? (
            <Line
              x1={xFor(clampedMonthIndex, pointCount, plotWidth)}
              x2={xFor(clampedMonthIndex, pointCount, plotWidth)}
              y1={PAD_TOP}
              y2={CHART_HEIGHT - PAD_BOTTOM}
              stroke={colors.border}
              strokeWidth={1}
            />
          ) : null}
          {showAreaFill && areaFillSeries ? (
            <Path d={buildAreaPath(areaFillSeries, pointCount, plotWidth, extent.min, extent.max, metric)} fill={`url(#${gradientId})`} stroke="none" />
          ) : null}
          {orderedForDraw.map((series) => {
            const isDimmed = emphasizedKeys !== null && !emphasizedKeys.has(series.key);
            const isHighlighted = emphasizedKeys !== null && emphasizedKeys.has(series.key);
            return (
              <Path
                key={series.key}
                d={buildLinePath(series, pointCount, plotWidth, extent.min, extent.max, metric)}
                fill="none"
                stroke={series.color}
                strokeOpacity={isDimmed ? 0.3 : 1}
                strokeWidth={isHighlighted ? 3 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}
          {orderedForDraw.map((series) => {
            const value = seriesValueAt(series, clampedMonthIndex, metric);
            if (value === null) return null;
            const isDimmed = emphasizedKeys !== null && !emphasizedKeys.has(series.key);
            const isHighlighted = emphasizedKeys !== null && emphasizedKeys.has(series.key);
            return (
              <Circle
                key={`${series.key}-dot`}
                cx={xFor(clampedMonthIndex, pointCount, plotWidth)}
                cy={yFor(value, extent.min, extent.max)}
                r={isHighlighted ? 4.5 : 3.5}
                fill={colors.surface}
                stroke={series.color}
                strokeOpacity={isDimmed ? 0.3 : 1}
                strokeWidth={2}
              />
            );
          })}
          <SvgText x={PAD_SIDE} y={PAD_TOP - 8} fontSize={10} fill={colors.textSecondary}>
            {money(extent.max)}
          </SvgText>
          <SvgText x={PAD_SIDE} y={CHART_HEIGHT - 1} fontSize={10} fill={colors.textSecondary}>
            {money(extent.min)}
          </SvgText>
        </Svg>
      </Pressable>

      <View style={styles.xAxisRow}>
        {canonicalTimeline.map((item, index) => {
          const showLabel = pointCount <= 6 || index === 0 || index === pointCount - 1 || index % Math.ceil(pointCount / 6) === 0;
          return (
            <Text key={item.month || index} style={styles.xAxisLabel}>
              {showLabel ? formatForecastMonth(item.month).split(' ')[0] : ''}
            </Text>
          );
        })}
      </View>

      {!hasMultipleSeries ? (
        <SingleSeriesDetail series={allSeries[0]} monthIndex={clampedMonthIndex} money={money} colors={colors} t={t} styles={styles} />
      ) : (
        <>
          <SeriesRows
            series={allSeries}
            typeSections={typeSections}
            monthLabel={selectedMonthLabel}
            monthIndex={clampedMonthIndex}
            metric={metric}
            hiddenKeys={hiddenKeys}
            emphasizedKeys={emphasizedKeys}
            highlightedGroupKey={highlightedGroupKey}
            expanded={rowsExpanded}
            onToggleExpanded={() => setRowsExpanded((current) => !current)}
            onToggleHidden={toggleHidden}
            onToggleHiddenGroup={toggleHiddenGroup}
            onToggleHighlight={toggleHighlight}
            onSelectGroup={toggleHighlightedGroup}
            onShowAll={showAll}
            hasHiddenOrHighlighted={hasHiddenOrHighlighted}
            money={money}
            styles={styles}
            colors={colors}
            t={t}
          />

          {level === 'owner' && highlightedSeries ? (
            <View style={styles.tooltipCard}>
              <SingleSeriesDetail series={highlightedSeries} monthIndex={clampedMonthIndex} money={money} colors={colors} t={t} styles={styles} />
            </View>
          ) : null}

          {(level === 'account' || level === 'type') && detailAccount && !showSideBySideDetail ? (
            <View style={styles.detailInline}>
              <AccountDetailPanel account={detailAccount} periodMonths={periodMonths} money={money} onClose={closeDetail} colors={colors} />
            </View>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <View style={styles.panel}>
      <View style={styles.controlsRow}>
        <ControlGroup caption={t('forecast.metricCaption')} styles={styles}>
          {metricOptions.map((option) => (
            <SegmentPill key={option.key} label={option.label} active={metric === option.key} onPress={() => setMetric(option.key)} styles={styles} />
          ))}
        </ControlGroup>
        <ControlGroup caption={t('forecast.groupByCaption')} styles={styles}>
          {levelOptions.map((option) => (
            <SegmentPill key={option.key} label={option.label} active={level === option.key} onPress={() => setLevel(option.key)} styles={styles} />
          ))}
        </ControlGroup>
        <ControlGroup caption={t('forecast.periodCaption')} styles={styles}>
          {FORECAST_PERIOD_OPTIONS.map((option) => (
            <SegmentPill
              key={option}
              label={t('forecast.periodMonthsShort', { count: option })}
              active={periodMonths === option}
              onPress={() => onChangePeriod(option)}
              styles={styles}
            />
          ))}
        </ControlGroup>
      </View>

      {!hasMovements ? (
        <Text style={styles.emptyText}>{t('forecast.noMovements')}</Text>
      ) : showSideBySideDetail ? (
        <View style={styles.bodyRow}>
          <View style={styles.bodyMain}>{chartBody}</View>
          <View style={styles.bodySide}>
            {detailAccount ? (
              <AccountDetailPanel account={detailAccount} periodMonths={periodMonths} money={money} onClose={closeDetail} colors={colors} />
            ) : (
              <View style={styles.detailPlaceholder}>
                <Ionicons name="analytics-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.detailPlaceholderText}>{t('forecast.selectAccountHint')}</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        chartBody
      )}
    </View>
  );
}

type ControlGroupProps = { caption: string; children: React.ReactNode; styles: ReturnType<typeof createStyles> };

function ControlGroup({ caption, children, styles }: ControlGroupProps) {
  return (
    <View style={styles.controlGroup}>
      <Text style={styles.controlCaption}>{caption}</Text>
      <View style={styles.controlPillRow}>{children}</View>
    </View>
  );
}

type SingleSeriesDetailProps = {
  series: GraphSeries;
  monthIndex: number;
  money: (value: number) => string;
  colors: any;
  t: (key: string, options?: any) => string;
  styles: ReturnType<typeof createStyles>;
};

// The compact readout for a single line: either the "only one line on
// screen" hero case (Total level, or a selection narrowed to one series),
// or — reused as-is — the fixed-position tooltip shown when a Type/User
// line is selected on the chart (Account-level selections get the richer
// AccountDetailPanel instead, since only an account has a single owner and
// a month-by-month breakdown worth a whole panel).
function SingleSeriesDetail({ series, monthIndex, money, colors, t, styles }: SingleSeriesDetailProps) {
  const item = series.timeline[monthIndex];
  const tone = (item?.movement ?? 0) >= 0 ? colors.success : colors.destructive;
  const percent = item ? formatPercent(getForecastMonthPercentChange(item)) : null;

  return (
    <View style={styles.heroDetail}>
      <View style={styles.heroDetailHeader}>
        <View style={[styles.dot, { backgroundColor: series.color }]} />
        <Text style={styles.heroDetailName} numberOfLines={1}>
          {series.subLabel ? `${series.label} · ${series.subLabel}` : series.label}
        </Text>
      </View>
      <Text style={styles.heroDetailLine}>
        {t('forecast.balanceLabel')}: <Text style={styles.heroDetailStrong}>{money(item?.balance ?? 0)}</Text>
      </Text>
      <Text style={styles.heroDetailLine}>
        {t('forecast.monthlyChangeLabel')}:{' '}
        <Text style={[styles.heroDetailStrong, { color: tone }]}>
          {formatSignedMoney(item?.movement ?? 0, money)}
          {percent ? ` (${percent})` : ''}
        </Text>
      </Text>
    </View>
  );
}

type SeriesRowsProps = {
  series: GraphSeries[];
  typeSections: TypeSection[] | null;
  monthLabel: string;
  monthIndex: number;
  metric: GraphMetric;
  hiddenKeys: Set<string>;
  /** Every key currently drawn at full emphasis on the chart (one account, or every account in a selected type) — null when nothing is selected. Drives the same dim/emphasize styling here as on the chart lines, so the legend and the chart always agree on what's "selected". */
  emphasizedKeys: Set<string> | null;
  highlightedGroupKey: string | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleHidden: (key: string) => void;
  onToggleHiddenGroup: (keys: string[]) => void;
  onToggleHighlight: (key: string) => void;
  onSelectGroup: (key: string) => void;
  onShowAll: () => void;
  hasHiddenOrHighlighted: boolean;
  money: (value: number) => string;
  styles: ReturnType<typeof createStyles>;
  colors: any;
  t: (key: string, options?: any) => string;
};

// This list is the Series Selector / legend AND the selected month's
// values in one — one full-width row per series (dot + name + owner, value
// + change on the right, matching the List view's own row language)
// instead of a separate chip legend plus a separate tooltip card repeating
// the same names. Tap a row to select that account (highlights its line on
// the chart and opens/updates the detail panel — tap the same row again to
// deselect); tap its eye icon to hide/show it. At the Account level, rows
// are grouped under their account type (Bank Accounts, Investments, ...)
// with a bulk show/hide pill per group, so this never becomes one very
// long flat list. Collapses to a one-line summary on phone once there are
// more than a handful of rows — see WageFlowCategoryMenu for the same
// collapsed/expanded precedent used elsewhere in the app.
function SeriesRows({
  series,
  typeSections,
  monthLabel,
  monthIndex,
  metric,
  hiddenKeys,
  emphasizedKeys,
  highlightedGroupKey,
  expanded,
  onToggleExpanded,
  onToggleHidden,
  onToggleHiddenGroup,
  onToggleHighlight,
  onSelectGroup,
  onShowAll,
  hasHiddenOrHighlighted,
  money,
  styles,
  colors,
  t,
}: SeriesRowsProps) {
  const visibleCount = series.length - hiddenKeys.size;
  const seriesByKey = new Map(series.map((item) => [item.key, item]));

  function renderRow(item: GraphSeries, isLast: boolean) {
    const isHidden = hiddenKeys.has(item.key);
    const isHighlighted = emphasizedKeys !== null && emphasizedKeys.has(item.key);
    const isDimmed = emphasizedKeys !== null && !isHighlighted;
    const value = seriesValueAt(item, monthIndex, metric);
    const monthItem = item.timeline[monthIndex];
    const tone = (monthItem?.movement ?? 0) >= 0 ? colors.success : colors.destructive;

    return (
      <View key={item.key} style={[styles.seriesRow, isLast && styles.seriesRowLast]}>
        <Pressable
          onPress={() => onToggleHighlight(item.key)}
          accessibilityRole="button"
          accessibilityState={{ selected: isHighlighted }}
          style={({ pressed }) => [styles.seriesRowMain, pressed && styles.pressed]}
        >
          <View style={[styles.dot, { backgroundColor: item.color, opacity: isHidden ? 0.35 : 1 }]} />
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={[styles.seriesRowLabel, (isHidden || isDimmed) && styles.seriesRowLabelMuted]} numberOfLines={1}>
              {item.label}
              {item.subLabel ? <Text style={styles.seriesRowSubLabel}> — {item.subLabel}</Text> : null}
            </Text>
          </View>
          {value !== null ? (
            <View style={styles.seriesRowValues}>
              <Text style={[styles.seriesRowBalance, (isHidden || isDimmed) && styles.seriesRowLabelMuted]}>{money(monthItem?.balance ?? 0)}</Text>
              <Text style={[styles.seriesRowChange, { color: isHidden || isDimmed ? colors.textSecondary : tone }]}>
                {formatSignedMoney(monthItem?.movement ?? 0, money)}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable hitSlop={8} onPress={() => onToggleHidden(item.key)} style={({ pressed }) => [styles.seriesRowEye, pressed && styles.pressed]}>
          <Ionicons name={isHidden ? 'eye-off-outline' : 'eye-outline'} size={14} color={colors.textSecondary} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.rowsCard}>
      <View style={styles.rowsHeader}>
        <Text style={styles.rowsMonth}>{monthLabel}</Text>
        <View style={styles.rowsHeaderRight}>
          {hasHiddenOrHighlighted ? (
            <Text onPress={onShowAll} style={styles.legendShowAll}>
              {t('forecast.showAllSeries')}
            </Text>
          ) : null}
          <Pressable onPress={onToggleExpanded} style={({ pressed }) => [styles.rowsToggle, pressed && styles.pressed]}>
            <Text style={styles.rowsToggleText}>{t('forecast.seriesVisibleCount', { count: visibleCount, total: series.length })}</Text>
            <Ionicons name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={13} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {expanded ? (
        <View>
          {typeSections ? (
            typeSections.map((section, sectionIndex) => {
              const groupHidden = section.seriesKeys.length > 0 && section.seriesKeys.every((key) => hiddenKeys.has(key));
              const groupSelected = highlightedGroupKey === section.key;
              return (
                <View key={section.key} style={sectionIndex > 0 ? styles.typeSection : undefined}>
                  <View style={styles.typeSectionHeader}>
                    {/* Siblings, not nested — a Pressable inside another
                        Pressable double-fires on react-native-web (see the
                        eye-icon rows below for the same precedent). Tap the
                        type name to select the whole type for details; tap
                        the eye to show/hide every account in it. */}
                    <Pressable
                      onPress={() => onSelectGroup(section.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: groupSelected }}
                      style={({ pressed }) => [styles.typeSectionLabelButton, pressed && styles.pressed]}
                    >
                      <Text style={[styles.typeSectionLabel, groupSelected && styles.typeSectionLabelActive]}>{section.label}</Text>
                    </Pressable>
                    <Pressable onPress={() => onToggleHiddenGroup(section.seriesKeys)} hitSlop={6} style={({ pressed }) => pressed && styles.pressed}>
                      <Ionicons name={groupHidden ? 'eye-off-outline' : 'eye-outline'} size={13} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                  {section.seriesKeys.map((key, index) => {
                    const item = seriesByKey.get(key);
                    if (!item) return null;
                    return renderRow(item, index === section.seriesKeys.length - 1);
                  })}
                </View>
              );
            })
          ) : (
            <View>{series.map((item, index) => renderRow(item, index === series.length - 1))}</View>
          )}
        </View>
      ) : null}
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
      style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && styles.pressed]}
    >
      <Text style={active ? styles.pillTextActive : styles.pillText}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    panel: { gap: spacing(2.5) },
    emptyText: { color: colors.textSecondary, fontSize: typography.fontSize[13], lineHeight: typography.lineHeight[18] },
    controlsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) },
    controlGroup: { gap: spacing(1) },
    controlCaption: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[10],
      fontWeight: typography.fontWeight.extraBold,
      textTransform: 'uppercase',
      letterSpacing: typography.letterSpacing[10],
    },
    controlPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
    pill: {
      paddingHorizontal: spacing(2),
      paddingVertical: spacing(0.75),
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    pillText: { color: colors.textSecondary, fontSize: typography.fontSize[11], fontWeight: typography.fontWeight.bold },
    pillTextActive: { color: colors.primaryForeground, fontSize: typography.fontSize[11], fontWeight: typography.fontWeight.bold },
    xAxisRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing(0.5) },
    xAxisLabel: { color: colors.textSecondary, fontSize: typography.fontSize[11], minWidth: spacing(6), textAlign: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    heroDetail: { gap: spacing(0.75) },
    heroDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
    heroDetailName: { color: colors.text, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.bold, flexShrink: 1 },
    heroDetailLine: { color: colors.textSecondary, fontSize: typography.fontSize[12] },
    heroDetailStrong: { color: colors.text, fontWeight: typography.fontWeight.extraBold },
    tooltipCard: { padding: spacing(3), borderRadius: radius.lg, backgroundColor: colors.surfaceMuted },
    legendShowAll: { color: colors.link, fontSize: typography.fontSize[11], fontWeight: typography.fontWeight.bold },
    rowsCard: { gap: spacing(1.5) },
    rowsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) },
    rowsMonth: { color: colors.text, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.extraBold },
    rowsHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
    rowsToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75) },
    rowsToggleText: { color: colors.textSecondary, fontSize: typography.fontSize[11], fontWeight: typography.fontWeight.semibold },
    typeSection: { marginTop: spacing(1.5) },
    typeSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing(1) },
    typeSectionLabelButton: { flexShrink: 1 },
    typeSectionLabel: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[11],
      fontWeight: typography.fontWeight.extraBold,
      textTransform: 'uppercase',
      letterSpacing: typography.letterSpacing[10],
    },
    typeSectionLabelActive: { color: colors.primary },
    seriesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(1.5),
      paddingVertical: spacing(1.5),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    seriesRowLast: { borderBottomWidth: 0 },
    seriesRowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), flex: 1, minWidth: 0 },
    seriesRowLabel: { color: colors.text, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold },
    seriesRowLabelMuted: { color: colors.textSecondary },
    seriesRowSubLabel: { color: colors.textSecondary, fontSize: typography.fontSize[11], fontWeight: typography.fontWeight.regular },
    seriesRowValues: { flexDirection: 'row', alignItems: 'baseline', gap: spacing(1.5) },
    seriesRowBalance: { color: colors.text, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold, fontVariant: ['tabular-nums'] },
    seriesRowChange: { fontSize: typography.fontSize[11], fontWeight: typography.fontWeight.semibold, fontVariant: ['tabular-nums'] },
    seriesRowEye: { paddingLeft: spacing(0.5) },
    bodyRow: { flexDirection: 'row', gap: spacing(4), alignItems: 'flex-start' },
    bodyMain: { flex: 1, minWidth: 0, gap: spacing(2.5) },
    bodySide: { width: spacing(80), gap: spacing(2.5) },
    detailPlaceholder: {
      padding: spacing(4),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing(1.5),
      minHeight: spacing(40),
    },
    detailPlaceholderText: { color: colors.textSecondary, fontSize: typography.fontSize[12], textAlign: 'center' },
    detailInline: { marginTop: spacing(0.5) },
    pressed: { opacity: 0.85 },
  });
}
