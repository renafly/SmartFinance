import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import '@/config/i18n';
import i18n from '@/config/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { PaymentBreakdownSection } from './payment-breakdown-section';

jest.mock('@/components/bug-report-fab', () => ({ BugReportFab: () => null }));
jest.setTimeout(60000);

function renderSection(reimbursements: { amount: number }[]) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>
        <PaymentBreakdownSection
          originalAmount={64.15}
          reimbursements={reimbursements}
          reimbursedBy={<Text>REIMBURSEMENTS EDITOR</Text>}
        >
          <Text>COST EDITOR</Text>
        </PaymentBreakdownSection>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function textOrder(view: ReturnType<typeof render>) {
  return JSON.stringify(view.toJSON());
}

describe('PaymentBreakdownSection', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows paid, reimbursed and effective cost at the top when there are reimbursements', async () => {
    const view = await renderSection([{ amount: 21.39 }]);
    expect(view.getByText('Paid')).toBeTruthy();
    expect(view.getByText('Reimbursed')).toBeTruthy();
    expect(view.getByText('Effective cost')).toBeTruthy();
    const tree = textOrder(view);
    expect(tree.indexOf('Effective cost')).toBeLessThan(tree.indexOf('REIMBURSEMENTS EDITOR'));
  });

  it('only shows the paid tile without reimbursements', async () => {
    const view = await renderSection([]);
    expect(view.getByText('Paid')).toBeTruthy();
    expect(view.queryByText('Effective cost')).toBeNull();
  });

  it('puts reimbursements before who bears the cost', async () => {
    const view = await renderSection([{ amount: 21.39 }]);
    const tree = textOrder(view);
    expect(tree.indexOf('Reimbursements')).toBeLessThan(tree.indexOf('Who bears the cost'));
    expect(tree.indexOf('REIMBURSEMENTS EDITOR')).toBeLessThan(tree.indexOf('COST EDITOR'));
  });

  it('keeps the summary visible when collapsed', async () => {
    const view = await renderSection([{ amount: 21.39 }]);
    await fireEvent.press(view.getByLabelText('Hide payment breakdown'));
    expect(view.queryByText('COST EDITOR')).toBeNull();
    expect(view.getByText('Effective cost')).toBeTruthy();
  });
});

describe('PaymentBreakdownSection without reimbursements editor', () => {
  it('keeps the paid-from label and shows no tiles (income)', async () => {
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
      >
        <ThemeProvider>
          <PaymentBreakdownSection originalAmount={10} reimbursements={[]}>
            <Text>ACCOUNT PICKER</Text>
          </PaymentBreakdownSection>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(view.getByText('Paid from')).toBeTruthy();
    expect(view.queryByText('Paid')).toBeNull();
    expect(view.queryByText('Who bears the cost')).toBeNull();
  });
});
