import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Guest } from './Guest';

const mockUseAuth = jest.fn();
const mockUseSegments = jest.fn();

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: unknown }) => {
    const { Text: MockText } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return <MockText testID="redirect">{String(href)}</MockText>;
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: () => mockUseSegments(),
}));

jest.mock('../providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Guest', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'user-1' } },
      restoring: false,
    });
  });

  it('redirects a signed-in user when the authentication route is active', async () => {
    mockUseSegments.mockReturnValue(['(auth)', 'login']);

    const view = await render(
      <Guest>
        <Text>Login</Text>
      </Guest>,
    );

    expect(view.getByTestId('redirect').props.children).toBe('/(protected)');
    expect(view.queryByText('Login')).toBeNull();
  });

  it('does not redirect when an inactive auth layout receives a session refresh', async () => {
    mockUseSegments.mockReturnValue(['(protected)', 'transactions']);

    const view = await render(
      <Guest>
        <Text>Inactive auth layout</Text>
      </Guest>,
    );

    expect(view.queryByTestId('redirect')).toBeNull();
    expect(view.getByText('Inactive auth layout')).toBeTruthy();
  });
});
