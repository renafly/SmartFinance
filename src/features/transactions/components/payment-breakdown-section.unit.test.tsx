import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import '@/config/i18n';
import i18n from '@/config/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { usePrivacyStore } from '@/stores/privacyStore';

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

function textOrder(view: Awaited<ReturnType<typeof render>>) {
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

describe('PaymentBreakdownSection with an unparsable amount', () => {
  it('never shows NaN while the amount is being typed', async () => {
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
      >
        <ThemeProvider>
          <PaymentBreakdownSection originalAmount={Number('12,')} reimbursements={[]} reimbursedBy={<Text>R</Text>}>
            <Text>C</Text>
          </PaymentBreakdownSection>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(JSON.stringify(view.toJSON())).not.toContain('NaN');
  });
});

describe('PaymentBreakdownSection privacy', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });
  afterEach(() => {
    usePrivacyStore.setState({ hideValues: true });
  });

  it('masks the tile amounts while values are hidden', async () => {
    usePrivacyStore.setState({ hideValues: true });
    const view = await renderSection([{ amount: 21.39 }]);
    const tree = JSON.stringify(view.toJSON());
    expect(tree).not.toMatch(/64[.,]15/);
    expect(tree).not.toMatch(/21[.,]39/);
    expect(tree).toContain('•');
  });

  it('shows the tile amounts when values are visible', async () => {
    usePrivacyStore.setState({ hideValues: false });
    const view = await renderSection([{ amount: 21.39 }]);
    expect(JSON.stringify(view.toJSON())).toMatch(/64[.,]15/);
  });
});
