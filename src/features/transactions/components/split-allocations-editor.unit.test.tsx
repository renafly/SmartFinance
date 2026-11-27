import { useState } from 'react';
import { render } from '@testing-library/react-native';

import '@/config/i18n';
import i18n from '@/config/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { usePrivacyStore } from '@/stores/privacyStore';

import { SplitAllocationsEditor } from './split-allocations-editor';
import type { AllocationDraft } from '@/features/transactions/utils/transaction-allocations';

jest.mock('@/components/bug-report-fab', () => ({ BugReportFab: () => null }));
jest.setTimeout(60000);

const ACCOUNTS = [
  { id: 'activo', name: 'Activo Bank', type: 'bank', current_balance: 97.1, owner_profile_id: null },
  { id: 'saude', name: 'Saude', type: 'savings', current_balance: 300, owner_profile_id: null },
];

function Harness({ initial, pots = [] }: { initial: AllocationDraft[]; pots?: { id: string; name: string }[] }) {
  const [allocations, setAllocations] = useState(initial);
  return (
    <SplitAllocationsEditor
      layout="table"
      receivedByAccountId={new Map([['activo', 21.39]])}
      enabled
      onToggleEnabled={() => undefined}
      totalAmount={42.76}
      accounts={ACCOUNTS as any}
      members={[]}
      pots={pots as any}
      allocations={allocations}
      onChangeAllocations={setAllocations}
      inputMode="value"
      onChangeInputMode={() => undefined}
      accountTypeLabels={{ bank: 'Bank', savings: 'Savings' }}
      sharedLabel="Shared"
      unassignedLabel="Unassigned"
      closeLabel="Close"
    />
  );
}

function renderHarness(initial: AllocationDraft[], pots?: { id: string; name: string }[]) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>
        <Harness initial={initial} pots={pots} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const complete: AllocationDraft[] = [
  { id: 'a', sourceType: 'account', accountId: 'activo', potId: null, amount: 22.76 },
  { id: 'b', sourceType: 'account', accountId: 'saude', potId: null, amount: 20 },
];

describe('SplitAllocationsEditor table layout', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
    usePrivacyStore.setState({ hideValues: false });
  });

  it('shows a received column with what each account got back', async () => {
    const view = await renderHarness(complete);
    expect(view.getByText('Received')).toBeTruthy();
    expect(view.getByText('Cost')).toBeTruthy();
    expect(view.getByText(/21[.,]39/)).toBeTruthy();
  });

  it('replaces the total/allocated card with one progress line', async () => {
    const view = await renderHarness(complete);
    expect(view.queryByText('Allocated')).toBeNull();
    expect(view.getByText(/42[.,]76 of .*42[.,]76 allocated/)).toBeTruthy();
  });

  it('says how much is still missing', async () => {
    const view = await renderHarness([{ ...complete[0] }, { ...complete[1], amount: 10 }]);
    expect(view.getByText(/10[.,]00 left/)).toBeTruthy();
  });

  it('hides the account/pot switch when there are no pots', async () => {
    const view = await renderHarness(complete);
    expect(view.queryByText('Pot')).toBeNull();
  });
});
