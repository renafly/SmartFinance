import { render } from '@testing-library/react-native';

import WelcomeScreen from '../app/(public)/index';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
}));

describe('native public entry route', () => {
  it('continues to open the login experience', async () => {
    const view = await render(<WelcomeScreen />);

    expect(view.getByTestId('redirect').props.children).toBe('/login');
  });
});
