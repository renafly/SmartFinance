import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { formatCurrency } from '@/components/migrated-page';
import { Badge, Table, TableCell, TableRow } from '@/components/data-surface';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';

import { GoalMeter } from './goal-meter';
import type { AllocationSegment } from '../types';

type PersonOverviewAccount = {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  monthlyChange: number;
  spentThisMonth: number;
};

type PersonOverviewPot = {
  id: string;
  name: string;
  balance: number;
  targetAmount: number | null;
};

type PersonOverviewCardProps = {
  row: { id: string; label: string; invested: number; savings: number; pots: number; total: number };
  accentColor: string;
  segments: AllocationSegment[];
  accounts: PersonOverviewAccount[];
  pots: PersonOverviewPot[];
  defaultCollapsed?: boolean;
};

// Replaces what used to be two separate dashboard sections — "By person"
// (totals + stacked bar) and "Investments, savings & pots" (the actual
// account rows) — which both grouped the exact same data by household
// member and read as duplicated information. This card merges them: the
// summary bar stays up top, and the underlying accounts/pots for that
// person are one tap away right below it.
export function PersonOverviewCard({ row, accentColor, segments, accounts, pots, defaultCollapsed = false }: PersonOverviewCardProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const hasDetails = accounts.length > 0 || pots.length > 0;
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderLeftColor: accentColor }]}>
      <Pressable
        onPress={() => hasDetails && setIsCollapsed((current) => !current)}
        accessibilityRole={hasDetails ? 'button' : undefined}
        accessibilityState={hasDetails ? { expanded: !isCollapsed } : undefined}
        accessibilityLabel={row.label}
        style={styles.header}
      >
        <View style={styles.headerTitle}>
          <Ionicons name={row.id === '__shared__' ? 'people-outline' : 'person-circle-outline'} size={18} color={accentColor} />
          <Text style={[styles.headerLabel, { color: colors.text }]}>{row.label}</Text>
        </View>
        <View style={styles.headerValue}>
          <Text style={[styles.headerTotal, { color: accentColor }]}>{displayCurrency(formatCurrency(row.total), hideValues)}</Text>
          {hasDetails ? (
            <Ionicons name={isCollapsed ? 'chevron-forward-outline' : 'chevron-down-outline'} size={16} color={colors.textSecondary} />
          ) : null}
        </View>
      </Pressable>

      <View style={[styles.stackedBarTrack, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {segments.map((segment) => {
          const value = row[segment.key as 'invested' | 'savings'];
          if (!value || value <= 0 || row.total <= 0) return null;

          return <View key={segment.key} style={[styles.stackedBarSegment, { backgroundColor: segment.color, flexGrow: value }]} />;
        })}
      </View>
      <View style={styles.legendRow}>
        {segments.map((segment) => (
          <Text key={segment.key} style={[styles.legendText, { color: colors.textSecondary }]}>
            {segment.label}: {displayCurrency(formatCurrency(row[segment.key as 'invested' | 'savings']), hideValues)}
          </Text>
        ))}
      </View>

      {hasDetails && !isCollapsed ? (
        <View style={styles.details}>
          {accounts.length > 0 ? (
            <Table
              columns={[
                { label: t('accounts.name'), flex: 2.2 },
                { label: t('dashboard.total'), align: 'right' },
                { label: t('dashboard.changeThisMonth'), align: 'right' },
                { label: t('dashboard.spentThisMonth'), align: 'right' },
              ]}
            >
              {accounts.map((account) => {
                const isSavingsAccount = account.type === 'savings';
                const accountAccent = isSavingsAccount ? colors.success : colors.primary;
                const accountAccentSoft = isSavingsAccount ? colors.successSoft : colors.primarySoft;

                return (
                  <TableRow key={account.id} onPress={() => router.push('/accounts' as any)}>
                    <TableCell flex={2.2}>
                      <View style={styles.accountTitle}>
                        <View style={[styles.accountIcon, { backgroundColor: accountAccentSoft }]}>
                          <Ionicons
                            name={account.type === 'ppr' ? 'shield-checkmark-outline' : isSavingsAccount ? 'wallet-outline' : 'trending-up-outline'}
                            size={17}
                            color={accountAccent}
                          />
                        </View>
                        <View style={styles.accountCopy}>
                          <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                            {account.name}
                          </Text>
                          <Badge label={t(`accounts.types.${account.type}`)} tone={isSavingsAccount ? 'success' : 'primary'} />
                        </View>
                      </View>
                    </TableCell>
                    <TableCell align="right" mobilePinned>
                      <Text style={[styles.accountBalance, { color: colors.text }]}>{displayCurrency(formatCurrency(account.currentBalance), hideValues)}</Text>
                    </TableCell>
                    <TableCell align="right">
                      <Text
                        style={{
                          color: account.monthlyChange > 0 ? colors.success : account.monthlyChange < 0 ? colors.destructive : colors.textSecondary,
                          fontWeight: typography.fontWeight.bold as any,
                        }}
                      >
                        {account.monthlyChange > 0 ? '+' : ''}
                        {displayCurrency(formatCurrency(account.monthlyChange), hideValues)}
                      </Text>
                    </TableCell>
                    <TableCell align="right">
                      <Text
                        style={{
                          color: account.spentThisMonth > 0 ? colors.destructive : colors.textSecondary,
                          fontWeight: typography.fontWeight.bold as any,
                        }}
                      >
                        {displayCurrency(formatCurrency(account.spentThisMonth), hideValues)}
                      </Text>
                    </TableCell>
                  </TableRow>
                );
              })}
            </Table>
          ) : null}

          {pots.length > 0 ? (
            <View style={styles.pots}>
              {pots.map((pot) => (
                <View key={pot.id} style={[styles.potCard, { backgroundColor: colors.surface, borderColor: colors.success }]}>
                  <View style={styles.potHeader}>
                    <View style={styles.potTitle}>
                      <View style={[styles.potIcon, { backgroundColor: colors.successSoft }]}>
                        <Ionicons name="flag-outline" size={16} color={colors.success} />
                      </View>
                      <Text style={[styles.potName, { color: colors.text }]} numberOfLines={1}>
                        {pot.name}
                      </Text>
                    </View>
                    <Text style={[styles.potBalance, { color: colors.text }]}>{displayCurrency(formatCurrency(pot.balance), hideValues)}</Text>
                  </View>
                  <GoalMeter balance={pot.balance} target={pot.targetAmount} />
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    borderLeftWidth: spacing(1),
    borderRadius: radius.lg,
    padding: spacing(3),
    gap: spacing(2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    minWidth: 0,
  },
  headerLabel: {
    fontSize: typography.fontSize[15],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  headerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  headerTotal: {
    fontSize: typography.fontSize[15],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  stackedBarTrack: {
    minHeight: spacing(3),
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  stackedBarSegment: {},
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  legendText: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  details: {
    gap: spacing(2.5),
    paddingTop: spacing(1),
  },
  accountTitle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(2),
    minWidth: 0,
  },
  accountIcon: {
    width: spacing(8),
    height: spacing(8),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing(0.5),
  },
  accountName: {
    fontSize: typography.fontSize[14],
    lineHeight: typography.lineHeight[20],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  accountBalance: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  pots: {
    gap: spacing(2),
  },
  potCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing(2.5),
    gap: spacing(2),
  },
  potHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing(2),
  },
  potTitle: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  potIcon: {
    width: spacing(7),
    height: spacing(7),
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  potName: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  potBalance: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.extraBold as any,
  },
});
