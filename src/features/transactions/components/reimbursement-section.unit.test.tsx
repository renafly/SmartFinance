import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import '@/config/i18n';
import i18n from '@/config/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { usePrivacyStore } from '@/stores/privacyStore';

import { ReimbursementSection } from './reimbursement-section';
import type { StagedReimbursement } from '@/features/transactions/utils/reimbursements';

jest.mock('@/components/bug-report-fab', () => ({ BugReportFab: () => null }));
jest.setTimeout(60000);

const ACCOUNTS = [
  { id: 'activo', name: 'Activo Bank', type: 'bank', current_balance: 97.1, owner_profile_id: null },
  { id: 'saude', name: 'Saude', type: 'savings', current_balance: 300, owner_profile_id: null },
];

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

function Harness({ initial = [RITA], fixedAccountId = 'activo' }: { initial?: StagedReimbursement[]; fixedAccountId?: string }) {
  const [rows, setRows] = useState<StagedReimbursement[]>(initial);
  return (
    <ReimbursementSection
      mode="staged"
      enabled
      onToggleEnabled={() => undefined}
      value={rows}
      onChange={setRows}
      fixedAccountId={fixedAccountId}
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

function renderHarness(props: { initial?: StagedReimbursement[]; fixedAccountId?: string } = {}) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>
        <Harness {...props} />
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

describe('ReimbursementSection (staged) edge cases', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows the account the reimbursement will really be saved in', async () => {
    const view = await renderHarness({ fixedAccountId: 'saude' });
    expect(view.getByText(/Saude/)).toBeTruthy();
    expect(view.queryByText(/Activo Bank/)).toBeNull();
  });

  it('opens the form straight away when there are no reimbursements yet', async () => {
    const view = await renderHarness({ initial: [] });
    expect(view.getByText('Paid back by')).toBeTruthy();
  });
});

describe('ReimbursementSection (staged) privacy', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });
  afterEach(() => {
    usePrivacyStore.setState({ hideValues: true });
  });

  it('masks each reimbursement amount while values are hidden', async () => {
    usePrivacyStore.setState({ hideValues: true });
    const view = await renderHarness();
    expect(JSON.stringify(view.toJSON())).not.toMatch(/21[.,]39/);
  });

  it('shows each reimbursement amount when values are visible', async () => {
    usePrivacyStore.setState({ hideValues: false });
    const view = await renderHarness();
    expect(JSON.stringify(view.toJSON())).toMatch(/21[.,]39/);
  });
});
