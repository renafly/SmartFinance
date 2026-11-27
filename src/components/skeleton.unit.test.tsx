import { render, screen } from '@testing-library/react-native';

import '@/config/i18n';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { SkeletonRows } from './skeleton';

jest.setTimeout(60000);

describe('SkeletonRows', () => {
  it('renders the requested number of placeholder rows', async () => {
    await render(
      <ThemeProvider>
        <SkeletonRows count={4} />
      </ThemeProvider>,
    );
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(4);
  });

  it('announces itself as a loading indicator with an accessible label', async () => {
    await render(
      <ThemeProvider>
        <SkeletonRows label="A carregar transações" />
      </ThemeProvider>,
    );
    const container = screen.getByLabelText('A carregar transações');
    expect(container.props.accessibilityRole).toBe('progressbar');
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(3);
  });
});
