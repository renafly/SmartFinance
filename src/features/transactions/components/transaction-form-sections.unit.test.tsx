import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import '@/config/i18n';
import i18n from '@/config/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { EssentialsSection, MoreDetailsSection } from './transaction-form-sections';

jest.mock('@/components/bug-report-fab', () => ({ BugReportFab: () => null }));
jest.setTimeout(60000);

function wrap(node: React.ReactNode) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>{node}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('EssentialsSection', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('lays out type, amount, title, then category next to date', async () => {
    const view = await wrap(
      <EssentialsSection
        typeSelector={<Text>TYPE</Text>}
        amount={<Text>AMOUNT</Text>}
        title={<Text>TITLE</Text>}
        category={<Text>CATEGORY</Text>}
        date={<Text>DATE</Text>}
      />,
    );
    const tree = JSON.stringify(view.toJSON());
    const order = ['TYPE', 'AMOUNT', 'TITLE', 'CATEGORY', 'DATE'].map((label) => tree.indexOf(label));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('leaves out slots that are not given (e.g. no category for a transfer)', async () => {
    const view = await wrap(<EssentialsSection amount={<Text>AMOUNT</Text>} title={<Text>TITLE</Text>} date={<Text>DATE</Text>} />);
    expect(view.getByText('DATE')).toBeTruthy();
    expect(view.queryByText('CATEGORY')).toBeNull();
  });
});

describe('MoreDetailsSection', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('starts collapsed with a summary and opens on press', async () => {
    const view = await wrap(
      <MoreDetailsSection summary={['2 tags', '1 attachment']}>
        <Text>NOTES FIELD</Text>
      </MoreDetailsSection>,
    );
    expect(view.getByText('More details')).toBeTruthy();
    expect(view.getByText('2 tags · 1 attachment')).toBeTruthy();
    expect(view.queryByText('NOTES FIELD')).toBeNull();
    await fireEvent.press(view.getByText('More details'));
    expect(view.getByText('NOTES FIELD')).toBeTruthy();
  });

  it('can start open', async () => {
    const view = await wrap(
      <MoreDetailsSection summary={[]} defaultOpen>
        <Text>NOTES FIELD</Text>
      </MoreDetailsSection>,
    );
    expect(view.getByText('NOTES FIELD')).toBeTruthy();
  });
});
