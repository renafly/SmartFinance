import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import '@/config/i18n';
import i18n from '@/config/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { ReimbursementSection } from './reimbursement-section';
import type { StagedReimbursement } from '@/features/transactions/utils/reimbursements';

jest.mock('@/components/bug-report-fab', () => ({ BugReportFab: () => null }));
jest.setTimeout(60000);

const ACCOUNTS = [{ id: 'activo', name: 'Activo Bank', type: 'bank', current_balance: 97.1, owner_profile_id: null }];

const RITA: StagedReimbursement = {
  key: 'r1',
  id: 'r1',
  payerName: 'Rita',
  amount: 21.39,
  receivedOn: '2026-11-16',
  sourceType: 'account',
  accountId: 'activo',
  potId: null,
  note: null,
};

function Harness() {
  const [rows, setRows] = useState<StagedReimbursement[]>([RITA]);
  return (
    <ReimbursementSection
      mode="staged"
      enabled
      onToggleEnabled={() => undefined}
      value={rows}
      onChange={setRows}
      fixedAccountId="activo"
      originalAmount={64.15}
      accounts={ACCOUNTS as any}
      members={[]}
      pots={[]}
      accountTypeLabels={{ bank: 'Bank' }}
      sharedLabel="Shared"
      unassignedLabel="Unassigned"
      closeLabel="Close"
    />
  );
}

function renderHarness() {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>
        <Harness />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('ReimbursementSection (staged)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('lists rows compactly with the receiving account and hides the add form until asked', async () => {
    const view = await renderHarness();
    expect(view.getByText('Rita')).toBeTruthy();
    expect(view.getByText(/Activo Bank/)).toBeTruthy();
    expect(view.queryByText('Paid back by')).toBeNull();

    await fireEvent.press(view.getByText('Add reimbursement'));
    expect(view.getByText('Paid back by')).toBeTruthy();
  });

  it('hides the long explanation behind a help button', async () => {
    const view = await renderHarness();
    expect(view.queryByText(/Money someone paid you back/)).toBeNull();
    await fireEvent.press(view.getByLabelText('About reimbursements'));
    expect(view.getByText(/Money someone paid you back/)).toBeTruthy();
  });
});
