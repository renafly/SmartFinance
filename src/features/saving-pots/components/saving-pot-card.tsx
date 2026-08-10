import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, formatCurrency } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import type { SavingPotForecast } from '../services/saving-pot-forecast.service';
import { buildForecastYearRows, formatForecastMonth, getAccountSummary, type SavingPotAccountOption } from '../ui-utils';

export type ForecastViewMode = 'monthly' | 'yearly';

type SavingPotCardProps = {
  pot: any;
  balance: any;
  forecast: SavingPotForecast | undefined;
  selectedAccounts: SavingPotAccountOption[];
  memberLabelMap: Map<string, string>;
  createdByLabel: string;
  isForecastExpanded: boolean;
  forecastViewMode: ForecastViewMode;
  onOpenMenu: () => void;
  onToggleForecast: () => void;
  onSetForecastViewMode: (mode: ForecastViewMode) => void;
};

export function SavingPotCard({
  pot,
  balance,
  forecast,
  selectedAccounts,
  memberLabelMap,
  createdByLabel,
  isForecastExpanded,
  forecastViewMode,
  onOpenMenu,
  onToggleForecast,
  onSetForecastViewMode,
}: SavingPotCardProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const selectedCount = Number(balance?.selected_account_count ?? 0);
  const targetValue = Number(balance?.target_amount ?? pot.target_amount ?? 0);
  const currentValue = Number(balance?.balance ?? 0);
  const remainingValue = Math.max(0, targetValue - currentValue);
  const sharedAccountCount = selectedAccounts.filter((account) => account.owner_profile_id === null).length;
  const personalAccountCount = selectedAccounts.length - sharedAccountCount;
  const forecastYears = forecast ? buildForecastYearRows(forecast.timeline) : [];
  const percent =
    balance?.target_amount && Number(balance.target_amount) > 0
      ? Math.min(100, Math.round((Number(balance.balance ?? 0) / Number(balance.target_amount)) * 100))
      : null;

  return (
    <Card>
      <View style={styles.potHeader}>
        <View style={styles.potTitleRow}>
          <Text style={styles.potName}>{balance?.name ?? pot.name}</Text>
          <Pressable
            onPress={onOpenMenu}
            accessibilityRole="button"
            accessibilityLabel={t('savings.actions')}
            style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
          >
            <Text style={styles.menuButtonText}>⋮</Text>
          </Pressable>
        </View>
        <View style={{ gap: spacing(1) }}>
          <Text style={styles.potMeta}>
            {t('savings.createdBy')}: {createdByLabel}
          </Text>
          <View style={styles.goalAmountGrid}>
            <View style={styles.goalAmountCell}>
              <Text style={styles.goalAmountLabel}>{t('savings.balance')}</Text>
              <Text style={styles.goalBalanceValue}>{formatCurrency(currentValue)}</Text>
            </View>
            <View style={styles.goalAmountCell}>
              <Text style={styles.goalAmountLabel}>{t('savings.targetAmount')}</Text>
              <Text style={styles.goalAmountValue}>{targetValue > 0 ? formatCurrency(targetValue) : t('savings.noTarget')}</Text>
            </View>
            {targetValue > 0 ? (
              <View style={styles.goalAmountCell}>
                <Text style={styles.goalAmountLabel}>{t('budgets.remaining', { value: '' })}</Text>
                <Text style={styles.goalAmountValue}>{formatCurrency(remainingValue)}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.potMeta}>
            {t('savings.saved')} {formatCurrency(balance?.saved ?? 0)} · {t('savings.spent')} {formatCurrency(balance?.spent ?? 0)}
          </Text>
          <Text style={styles.potMeta}>
            {t('savings.accountsUsed')}: {t('savings.scopeAccountSpecific', { count: selectedCount })}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent ?? 0}%` }]} />
        </View>
        <View style={styles.progressCaption}>
          <Text style={styles.progressText}>{percent !== null ? t('savings.progress', { percent }) : t('savings.noTarget')}</Text>
          {targetValue > 0 ? <Text style={styles.progressText}>{t('budgets.remaining', { value: formatCurrency(remainingValue) })}</Text> : null}
        </View>
        <View style={styles.scopeRow}>
          {sharedAccountCount > 0 ? <Text style={styles.scopeChip}>{t('savings.scopeShared')} · {sharedAccountCount}</Text> : null}
          {personalAccountCount > 0 ? <Text style={styles.scopeChip}>{t('budget.incomeModes.individual')} · {personalAccountCount}</Text> : null}
          <Text style={styles.scopeChip}>{t('savings.scopeAccountSpecific', { count: selectedCount })}</Text>
        </View>
        {selectedAccounts.length > 0 ? (
          <View style={styles.accountBalancePanel}>
            <Text style={styles.accountBalanceTitle}>{t('savings.balanceByAccount')}</Text>
            <View style={styles.accountBalanceColumnLabels}>
              <Text style={[styles.accountBalanceColumnLabel, styles.accountBalanceNameColumn]}>{t('savings.accountColumn')}</Text>
              <Text style={styles.accountBalanceColumnLabel}>{t('savings.balanceColumn')}</Text>
            </View>
            {selectedAccounts.map((account) => (
              <View key={account.id} style={styles.accountBalanceRow}>
                <View style={styles.accountBalanceNameColumn}>
                  <Text style={styles.accountBalanceName}>{account.name}</Text>
                  <Text style={styles.accountBalanceMeta}>{getAccountSummary(account, memberLabelMap, t('savings.scopeShared'))}</Text>
                </View>
                <Text style={styles.accountBalanceValue}>{formatCurrency(account.current_balance)}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {forecast?.completionDate ? (
          <Text style={styles.potMeta}>
            {t('savings.estimatedFinish', { value: new Date(`${forecast.completionDate}T12:00:00`).toLocaleDateString() })}
          </Text>
        ) : (
          <Text style={styles.potMeta}>
            {forecast?.unavailableReason === 'missing_target'
              ? t('savings.forecastUnavailableNoTarget')
              : forecast?.unavailableReason === 'beyond_horizon'
                ? t('savings.forecastUnavailableBeyondHorizon')
                : t('savings.forecastUnavailableNoContributions')}
          </Text>
        )}
        {forecast?.monthlyContribution ? (
          <View style={{ gap: spacing(0.5) }}>
            <Text style={styles.potMeta}>
              {t('savings.forecastMonthlyContribution', { value: formatCurrency(forecast.monthlyContribution) })}
            </Text>
            {forecast.sources.map((source) => (
              <Text key={source.kind} style={styles.potMeta}>
                {source.kind === 'recurring_transfer'
                  ? t('savings.forecastRecurringTransfers', { value: formatCurrency(source.monthlyContribution) })
                  : t('savings.forecastMonthlyBudget', { value: formatCurrency(source.monthlyContribution) })}
              </Text>
            ))}
          </View>
        ) : null}
        {forecast && forecast.timeline.length > 0 ? (
          <>
            <Pressable
              onPress={onToggleForecast}
              accessibilityRole="button"
              accessibilityState={{ expanded: isForecastExpanded }}
              style={({ pressed }) => [styles.forecastToggle, pressed && styles.pressed]}
            >
              <Text style={styles.forecastToggleText}>
                {isForecastExpanded ? t('savings.hideForecast') : t('savings.showForecast')}
              </Text>
              <Text style={styles.forecastToggleChevron}>{isForecastExpanded ? '▴' : '▾'}</Text>
            </Pressable>
            {isForecastExpanded ? (
              <View style={styles.forecastPanel}>
                <View style={styles.forecastPanelHeader}>
                  <Text style={styles.forecastPanelTitle}>{t('savings.forecastTimeline')}</Text>
                  <View style={styles.forecastViewToggle}>
                    {(['monthly', 'yearly'] as const).map((mode) => (
                      <Pressable
                        key={mode}
                        onPress={() => onSetForecastViewMode(mode)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: forecastViewMode === mode }}
                        style={({ pressed }) => [
                          styles.forecastViewButton,
                          forecastViewMode === mode && styles.forecastViewButtonActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={forecastViewMode === mode ? styles.forecastViewButtonTextActive : styles.forecastViewButtonText}>
                          {mode === 'monthly' ? t('savings.forecastMonthlyView') : t('savings.forecastYearlyView')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.forecastColumnLabels}>
                  <Text style={[styles.forecastColumnLabel, styles.forecastLabelPrimary]}>
                    {forecastViewMode === 'monthly' ? t('savings.forecastMonth') : t('savings.forecastYear')}
                  </Text>
                  <Text style={styles.forecastColumnLabel}>{t('savings.forecastContributionShort')}</Text>
                  <Text style={styles.forecastColumnLabel}>{t('savings.forecastBalanceShort')}</Text>
                </View>
                {forecastViewMode === 'monthly' ? (
                  <View style={styles.forecastTimelineContent}>
                    {forecast.timeline.map((item) => (
                      <View key={item.month} style={[styles.forecastRow, item.reachedTarget && styles.forecastRowComplete]}>
                        <Text style={[styles.forecastRowText, styles.forecastLabelPrimary]}>{formatForecastMonth(item.month)}</Text>
                        <Text style={styles.forecastRowText}>{formatCurrency(item.contribution)}</Text>
                        <Text style={styles.forecastRowBalance}>{formatCurrency(item.projectedAmount)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.forecastYearRows}>
                    {forecastYears.map((item) => (
                      <View key={item.year} style={[styles.forecastRow, item.remainingAmount === 0 && styles.forecastRowComplete]}>
                        <Text style={[styles.forecastRowText, styles.forecastLabelPrimary]}>{item.year}</Text>
                        <Text style={styles.forecastRowText}>{formatCurrency(item.contribution)}</Text>
                        <Text style={styles.forecastRowBalance}>{formatCurrency(item.projectedAmount)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </Card>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    potHeader: { gap: spacing(2.5) },
    potTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing(3) },
    potName: { color: colors.text, fontSize: typography.fontSize[18], fontWeight: typography.fontWeight.extraBold, flex: 1 },
    menuButton: {
      alignSelf: 'flex-start',
      width: spacing(10.5),
      height: spacing(10.5),
      borderRadius: radius.mdPlus,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuButtonText: { color: colors.text, fontSize: typography.fontSize[22], fontWeight: typography.fontWeight.extraBold, lineHeight: typography.lineHeight[22] },
    goalAmountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
    goalAmountCell: {
      flexGrow: 1,
      minWidth: spacing(28),
      gap: spacing(0.5),
      padding: spacing(2.5),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    goalAmountLabel: { color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold },
    goalBalanceValue: { color: colors.success, fontSize: typography.fontSize[18], fontWeight: typography.fontWeight.extraBold },
    goalAmountValue: { color: colors.text, fontSize: typography.fontSize[16], fontWeight: typography.fontWeight.extraBold },
    potMeta: { color: colors.textSecondary, fontSize: typography.fontSize[12], lineHeight: typography.lineHeight[17] },
    progressTrack: {
      marginTop: spacing(1.5),
      height: spacing(2.5),
      borderRadius: radius.full,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.success },
    progressCaption: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing(2) },
    progressText: { color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold },
    scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) },
    scopeChip: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.semibold,
      paddingHorizontal: spacing(2),
      paddingVertical: spacing(1),
      borderRadius: radius.full,
      backgroundColor: colors.surfaceMuted,
    },
    accountBalancePanel: { gap: spacing(2), padding: spacing(3), borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    accountBalanceTitle: { color: colors.text, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.extraBold },
    accountBalanceColumnLabels: { flexDirection: 'row', gap: spacing(2), paddingHorizontal: spacing(2) },
    accountBalanceColumnLabel: { flex: 1, color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold, textAlign: 'right', textTransform: 'uppercase' },
    accountBalanceNameColumn: { flex: 2, textAlign: 'left' },
    accountBalanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(2), paddingVertical: spacing(2), borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
    accountBalanceName: { color: colors.text, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.bold },
    accountBalanceMeta: { color: colors.textSecondary, fontSize: typography.fontSize[12] },
    accountBalanceValue: { flex: 1, color: colors.success, fontSize: typography.fontSize[14], fontWeight: typography.fontWeight.extraBold, textAlign: 'right' },
    forecastToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing(2),
      marginTop: spacing(1),
      paddingHorizontal: spacing(3),
      paddingVertical: spacing(2),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    forecastToggleText: { color: colors.primary, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.extraBold },
    forecastToggleChevron: { color: colors.textSecondary, fontSize: typography.fontSize[16], fontWeight: typography.fontWeight.bold },
    forecastPanel: { gap: spacing(2), padding: spacing(3), borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    forecastPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing(2) },
    forecastPanelTitle: { color: colors.text, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.extraBold },
    forecastViewToggle: { flexDirection: 'row', borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    forecastViewButton: { paddingHorizontal: spacing(2), paddingVertical: spacing(1) },
    forecastViewButtonActive: { backgroundColor: colors.primary },
    forecastViewButtonText: { color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold },
    forecastViewButtonTextActive: { color: colors.primaryForeground, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold },
    forecastColumnLabels: { flexDirection: 'row', gap: spacing(1), paddingHorizontal: spacing(2) },
    forecastColumnLabel: { flex: 1, color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold, textAlign: 'right', textTransform: 'uppercase' },
    forecastLabelPrimary: { flex: 1.25, textAlign: 'left' },
    forecastTimelineContent: { gap: spacing(1) },
    forecastYearRows: { gap: spacing(1) },
    forecastRow: { flexDirection: 'row', gap: spacing(1), paddingHorizontal: spacing(2), paddingVertical: spacing(1.5), borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
    forecastRowComplete: { backgroundColor: colors.successSoft },
    forecastRowText: { flex: 1, color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold, textAlign: 'right' },
    forecastRowBalance: { flex: 1, color: colors.text, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.extraBold, textAlign: 'right' },
    pressed: { opacity: 0.85 },
  });
}
