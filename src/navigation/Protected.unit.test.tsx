import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Protected } from './Protected';

const mockUseAuth = jest.fn();

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: unknown }) => {
    const { Text: MockText } = require('react-native');
    return <MockText testID="redirect">{JSON.stringify(href)}</MockText>;
  },
  useGlobalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/(protected)'),
}));

jest.mock('../providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../features/auth/components/auth-loading-transition', () => ({
  AuthLoadingTransition: () => {
    const { Text: MockText } = require('react-native');
    return <MockText testID="auth-loading-transition">Loading</MockText>;
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ colors: { background: '#fff', text: '#000' } }),
}));

jest.mock('../features/setup', () => ({
  SetupWizard: () => {
    const { Text: MockText } = require('react-native');
    return <MockText testID="setup-wizard">Setup</MockText>;
  },
}));

jest.mock('@/components/migrated-page', () => ({
  Button: ({ label }: { label: string }) => {
    const { Text: MockText } = require('react-native');
    return <MockText>{label}</MockText>;
  },
}));

describe('Protected', () => {
  it.each([
    { label: 'the Supabase session is restoring', session: null, restoring: true, isLoading: true },
    { label: 'the profile and household are loading', session: { user: { id: 'user-1' } }, restoring: false, isLoading: true },
  ])('shows the transition while $label', async ({ session, restoring, isLoading }) => {
    mockUseAuth.mockReturnValue({ session, restoring, isLoading });

    const view = await render(
      <Protected>
        <Text>Dashboard</Text>
      </Protected>,
    );

    expect(view.getByTestId('auth-loading-transition')).toBeTruthy();
    expect(view.queryByText('Dashboard')).toBeNull();
  });

  it('renders protected content only after auth hydration finishes', async () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'user-1' } },
      restoring: false,
      isLoading: false,
      householdId: 'household-1',
    });

    const view = await render(
      <Protected>
        <Text>Dashboard</Text>
      </Protected>,
    );

    expect(view.getByText('Dashboard')).toBeTruthy();
    expect(view.queryByTestId('auth-loading-transition')).toBeNull();
  });

  // The household-setup suggestion is driven only by the authenticated user's
  // accepted household_members rows (loaded into useAuth().householdId by
  // useSession) -- never by a device/local flag -- so the same account gets the
  // same answer on any device, after a cache clear, or after re-login.
  describe('household setup suggestion', () => {
    const signedIn = { session: { user: { id: 'user-1' } }, restoring: false, isLoading: false };

    it('shows the setup wizard when the account has no household', async () => {
      mockUseAuth.mockReturnValue({ ...signedIn, householdId: null, sessionError: false });

      const view = await render(<Protected><Text>Dashboard</Text></Protected>);

      expect(view.getByTestId('setup-wizard')).toBeTruthy();
      expect(view.queryByText('Dashboard')).toBeNull();
    });

    it('never shows the setup wizard when the account already belongs to a household', async () => {
      mockUseAuth.mockReturnValue({ ...signedIn, householdId: 'household-1', sessionError: false });

      const view = await render(<Protected><Text>Dashboard</Text></Protected>);

      expect(view.queryByTestId('setup-wizard')).toBeNull();
      expect(view.getByText('Dashboard')).toBeTruthy();
    });

    it('does not suggest creating a household when membership could not be loaded', async () => {
      mockUseAuth.mockReturnValue({ ...signedIn, householdId: null, sessionError: true, refreshSession: jest.fn() });

      const view = await render(<Protected><Text>Dashboard</Text></Protected>);

      expect(view.queryByTestId('setup-wizard')).toBeNull();
      expect(view.getByText('Try again')).toBeTruthy();
    });
  });
});
