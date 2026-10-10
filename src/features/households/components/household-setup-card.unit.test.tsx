import { act, fireEvent, render } from '@testing-library/react-native';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

import { HouseholdSetupCard } from './household-setup-card';

const mockRefreshSession = jest.fn();
const mockCreate = jest.fn();
const mockAccept = jest.fn();
const mockDecline = jest.fn();
let mockHouseholds: { data?: unknown[]; isPending: boolean; fetchStatus: string };
let mockInvitations: { data?: unknown[]; isError: boolean; refetch: jest.Mock };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      text: '#000', textSecondary: '#555', destructive: '#f00', primary: '#00f',
      primarySoft: '#eef', border: '#ddd', surfaceMuted: '#f5f5f5',
    },
  }),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ refreshSession: mockRefreshSession }),
}));

jest.mock('@/components/migrated-page', () => {
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Card: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} onPress={disabled ? undefined : onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
    Field: ({ label, ...props }: { label: string }) => <TextInput accessibilityLabel={label} {...props} />,
  };
});

jest.mock('@/features/households/hooks', () => ({
  useMyHouseholds: () => mockHouseholds,
  useMyHouseholdInvitations: () => mockInvitations,
  useCreateHousehold: () => ({ mutateAsync: mockCreate, isPending: false }),
  useAcceptHouseholdInvitation: () => ({ mutateAsync: mockAccept, isPending: false }),
  useDeclineHouseholdInvitation: () => ({ mutate: mockDecline, isPending: false }),
}));

describe('HouseholdSetupCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHouseholds = { data: [], isPending: false, fetchStatus: 'idle' };
    mockInvitations = { data: [], isError: false, refetch: jest.fn() };
  });

  it('creates a household once, then shows the finishing state instead of the form', async () => {
    const pending = deferred<{ id: string; name: string }>();
    mockCreate.mockReturnValue(pending.promise);
    const view = await render(<HouseholdSetupCard />);

    await fireEvent.changeText(view.getByLabelText('settings.householdName'), '  Home  ');
    await fireEvent.press(view.getByText('householdSetup.create'));
    // A second tap while the first request is in flight must not create again.
    await fireEvent.press(view.getByText('householdSetup.create'));

    await act(async () => {
      pending.resolve({ id: 'h1', name: 'Home' });
      await pending.promise;
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith('Home');
    expect(view.getByTestId('household-setup-finishing')).toBeTruthy();
    expect(view.queryByText('householdSetup.create')).toBeNull();
  });

  it('shows an error and keeps the form when creation fails', async () => {
    mockCreate.mockRejectedValue(new Error('boom'));
    const view = await render(<HouseholdSetupCard />);

    await fireEvent.changeText(view.getByLabelText('settings.householdName'), 'Home');
    await fireEvent.press(view.getByText('householdSetup.create'));

    expect(await view.findByText('boom')).toBeTruthy();
    expect(view.getByText('householdSetup.create')).toBeTruthy();
  });

  it('lets the user accept a pending invitation', async () => {
    mockInvitations.data = [{ id: 'i1', token: 'tok', household_name: 'Silva' }];
    mockAccept.mockResolvedValue({ household_id: 'h2' });
    const view = await render(<HouseholdSetupCard />);

    expect(view.getByText('Silva')).toBeTruthy();
    await fireEvent.press(view.getByText('householdSetup.accept'));

    expect(mockAccept).toHaveBeenCalledWith('tok');
    expect(await view.findByTestId('household-setup-finishing')).toBeTruthy();
  });

  it('never offers creation when the database already lists a membership', async () => {
    mockHouseholds.data = [{ id: 'h1', name: 'Home' }];
    const view = await render(<HouseholdSetupCard />);

    expect(view.queryByText('householdSetup.create')).toBeNull();
    await fireEvent.press(view.getByText('householdSetup.reload'));
    expect(mockRefreshSession).toHaveBeenCalled();
  });
});
