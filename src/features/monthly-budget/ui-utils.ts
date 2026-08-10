import type { MonthlyBudgetRuleDraft } from './hooks';
import type { BudgetMemberLike } from './types';

export const MONTH_OPTIONS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

export function getMemberLabel(member?: BudgetMemberLike | null, fallback = 'Shared') {
  if (!member) return fallback;
  return member.fullName?.trim() || member.email || fallback;
}

export function formatMonthSelection(months: number[]) {
  if (months.length === 0) return 'All months';

  return months
    .map((month) => MONTH_OPTIONS.find((option) => option.value === month)?.label ?? String(month))
    .join(', ');
}

export function getSectionBadgeStyle(
  section: MonthlyBudgetRuleDraft['section'],
  colors: any,
) {
  switch (section) {
    case 'savings':
      return { backgroundColor: colors.successSoft, color: colors.success };
    case 'investments':
      return { backgroundColor: colors.warningSoft, color: colors.warning };
    case 'pots':
      return { backgroundColor: colors.primary, color: colors.primaryForeground };
    case 'ppr':
      return { backgroundColor: colors.destructiveSoft, color: colors.destructive };
    case 'remaining_cash':
      return { backgroundColor: colors.muted, color: colors.textSecondary };
    default:
      return { backgroundColor: colors.surfaceMuted, color: colors.textSecondary };
  }
}

export function getSectionBadgeIcon(section: MonthlyBudgetRuleDraft['section']) {
  switch (section) {
    case 'savings':
      return 'shield-checkmark-outline';
    case 'investments':
      return 'trending-up-outline';
    case 'pots':
      return 'save-outline';
    case 'ppr':
      return 'shield-outline';
    case 'remaining_cash':
      return 'wallet-outline';
    default:
      return 'layers-outline';
  }
}

export function getMemberAccentColor(index: number, colors: any) {
  const palette = [colors.primary, colors.success, colors.warning, colors.destructive];
  return palette[index % palette.length];
}
