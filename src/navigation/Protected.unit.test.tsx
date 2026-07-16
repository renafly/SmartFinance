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
    });

    const view = await render(
      <Protected>
        <Text>Dashboard</Text>
      </Protected>,
    );

    expect(view.getByText('Dashboard')).toBeTruthy();
    expect(view.queryByTestId('auth-loading-transition')).toBeNull();
  });
});
