import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecurringExpensesCard } from './recurring-expenses-card';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options && 'name' in options ? `${key}:${String(options.name)}` : options && 'count' in options ? `${key}:${String(options.count)}` : key),
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ colors: require('@/theme/colors').lightColors }),
}));

jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 'profile-1' } }) }));
jest.mock('@/providers/ToastProvider', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('@/components/grouped-account-select', () => ({ GroupedAccountSelect: () => null }));
jest.mock('@/components/category-picker', () => ({ CategoryPicker: () => null }));

function plannedItem(id: string, name: string, categoryId: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    householdId: 'household-1',
    name,
    direction: 'outflow',
    amount: 10,
    sourceAccountId: 'acct-1',
    categoryId,
    ownerMemberId: null,
    isEstimate: false,
    allocationMode: 'single',
    recurrenceType: 'monthly',
    recurrenceMonths: null,
    recurrenceIntervalMonths: null,
    oneTimeMonth: null,
    startMonth: null,
    endMonth: null,
    isActive: true,
    definitionVersion: 1,
    notes: null,
    deletedAt: null,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    destinations: [],
    ...overrides,
  };
}

const mockItems = [
  plannedItem('i-electricity', 'Electricity', 'utilities'),
  plannedItem('i-water', 'Water', 'utilities'),
  plannedItem('i-netflix', 'Netflix', 'subscriptions'),
  // A split item (has destinations) -- out of this card's scope, never listed.
  plannedItem('i-split', 'Split allocation', 'utilities', { destinations: [{ id: 'd1' }] }),
];

const mutation = () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false });

jest.mock('@/features/planned-items/hooks', () => ({
  usePlannedItems: () => ({ data: mockItems, isLoading: false }),
  useCreatePlannedItem: () => mutation(),
  useUpdatePlannedItem: () => mutation(),
  useSetPlannedItemActive: () => mutation(),
  useDeletePlannedItem: () => mutation(),
}));

const categories = [
  { id: 'utilities', name: 'Utilities', parent_id: null, type: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', parent_id: null, type: 'expense' },
] as any;

function renderCard() {
  return render(<RecurringExpensesCard accounts={[]} members={[]} categories={categories} />);
}

describe('RecurringExpensesCard grouping and collapsing', () => {
  it('groups recurring expenses under their category names', async () => {
    await renderCard();
    expect(screen.getByText('Utilities')).toBeTruthy();
    expect(screen.getByText('Subscriptions')).toBeTruthy();
    expect(screen.getByText('Electricity')).toBeTruthy();
    expect(screen.getByText('Water')).toBeTruthy();
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.queryByText('Split allocation')).toBeNull();
    expect(screen.getByText('budget.categoryBudgets.recurring.groupCount:2')).toBeTruthy();
  });

  it('collapses and expands one category group at a time, keeping the category name visible', async () => {
    await renderCard();
    await fireEvent.press(screen.getByLabelText('budget.categoryBudgets.recurring.collapseGroup:Utilities'));

    expect(screen.getByText('Utilities')).toBeTruthy();
    expect(screen.queryByText('Electricity')).toBeNull();
    expect(screen.queryByText('Water')).toBeNull();
    // Other groups are unaffected.
    expect(screen.getByText('Netflix')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('budget.categoryBudgets.recurring.expandGroup:Utilities'));
    expect(screen.getByText('Electricity')).toBeTruthy();
  });

  it('collapses and expands every group at once, with all category names still shown', async () => {
    await renderCard();
    await fireEvent.press(screen.getByText('budget.categoryBudgets.recurring.collapseAll'));
    expect(screen.queryByText('Electricity')).toBeNull();
    expect(screen.queryByText('Netflix')).toBeNull();
    expect(screen.getByText('Utilities')).toBeTruthy();
    expect(screen.getByText('Subscriptions')).toBeTruthy();

    await fireEvent.press(screen.getByText('budget.categoryBudgets.recurring.expandAll'));
    expect(screen.getByText('Electricity')).toBeTruthy();
    expect(screen.getByText('Netflix')).toBeTruthy();
  });

  it('lets the whole recurring-expenses section be collapsed and expanded', async () => {
    await renderCard();
    await fireEvent.press(screen.getByLabelText('Collapse budget.categoryBudgets.recurring.title'));
    expect(screen.queryByText('Utilities')).toBeNull();
    expect(screen.queryByText('budget.categoryBudgets.recurring.addButton')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Expand budget.categoryBudgets.recurring.title'));
    expect(screen.getByText('Utilities')).toBeTruthy();
  });
});
