import { render } from '@testing-library/react-native';

import '@/config/i18n';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AuthLoadingTransition } from './auth-loading-transition';

describe('AuthLoadingTransition', () => {
  it('announces that the dashboard is busy without exposing decorative stages', async () => {
    const view = await render(
      <ThemeProvider>
        <AuthLoadingTransition />
      </ThemeProvider>,
    );

    const loader = view.getByRole('progressbar', { name: 'Preparing your SmartFinance dashboard' });

    expect(loader.props.accessibilityState).toEqual({ busy: true });
    expect(view.getByText('Your financial home is taking shape')).toBeTruthy();
  });
});
