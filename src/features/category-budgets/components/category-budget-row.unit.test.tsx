import { fireEvent, render, screen } from '@testing-library/react-native';

import type { CategoryBudgetEntry } from '../services/category-budget-view-model';
import { CategoryBudgetRow } from './category-budget-row';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options && 'name' in options ? `${key}:${String(options.name)}` : key),
    i18n: { language: 'en' },
  }),
}));
jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ colors: require('@/theme/colors').lightColors }),
}));
jest.mock('@/providers/ToastProvider', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('@/features/planned-items/components/occurrence-match-picker', () => ({ PlannedItemOccurrenceMatchPicker: () => null }));
jest.mock('@/features/planned-items/hooks', () => {
  const mutation = () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false });
  return {
    useConfirmPlannedItemOccurrence: mutation,
    useMatchPlannedItemOccurrence: mutation,
    useRevertPlannedItemOccurrence: mutation,
    useUnlinkPlannedItemOccurrenceTransaction: mutation,
    useUnmatchPlannedItemOccurrence: mutation,
  };
});

const own = { categoryId: 'food', categoryName: 'Food', actualSpent: 0, transactions: [], plannedUnpaid: [], plannedPaid: [], unpaidTotal: 0 };
const entry: CategoryBudgetEntry = {
  categoryId: 'food',
  categoryName: 'Food',
  parentId: null,
  mainCategoryId: 'food',
  own,
  childBreakdown: [],
  budgetAmount: 500,
  budgetEffectiveMonth: '2026-09-01',
  actualSpent: 0,
  unpaidTotal: 0,
  expectedTotal: 0,
  remaining: 500,
  percentUsed: 0,
  actualPercentUsed: 0,
  status: 'ok',
};

describe('CategoryBudgetRow delete affordance', () => {
  it('asks the parent to delete this category budget when the trash icon is pressed', async () => {
    const onDelete = jest.fn();
    await render(<CategoryBudgetRow entry={entry} month="2026-09" onDelete={onDelete} />);
    await fireEvent.press(screen.getByLabelText('budget.categoryBudgets.deleteBudget:Food'));
    expect(onDelete).toHaveBeenCalledWith('food', 'Food');
  });

  it('hides the delete affordance when no onDelete handler is given', async () => {
    await render(<CategoryBudgetRow entry={entry} month="2026-09" />);
    expect(screen.queryByLabelText('budget.categoryBudgets.deleteBudget:Food')).toBeNull();
  });

  it('shows a "planned" status and paid-vs-expected wording when the limit is filled only by unpaid planned expenses', async () => {
    const plannedEntry: CategoryBudgetEntry = {
      ...entry,
      categoryName: 'Gás',
      budgetAmount: 40,
      unpaidTotal: 40,
      expectedTotal: 40,
      remaining: 0,
      percentUsed: 100,
      actualPercentUsed: 0,
      status: 'planned',
    };
    await render(<CategoryBudgetRow entry={plannedEntry} month="2026-10" />);
    expect(screen.getByText('budget.categoryBudgets.status.planned')).toBeTruthy();
    expect(screen.getByText('budget.categoryBudgets.percentPaidAndExpected')).toBeTruthy();
    expect(screen.getByText('budget.categoryBudgets.remainingAfterPlanned')).toBeTruthy();
    expect(screen.queryByText('budget.categoryBudgets.status.approaching')).toBeNull();
  });
});
