import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import '@/config/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { GroupedAccountSelect } from './grouped-account-select';

jest.mock('@/components/bug-report-fab', () => ({ BugReportFab: () => null }));
// The first render loads the whole theme/i18n/modal stack, which can be slow.
jest.setTimeout(60000);

const MEMBERS = [
  { userId: 'ana', fullName: 'Ana', email: null },
  { userId: 'rui', fullName: 'Rui', email: null },
];
const ACCOUNTS = [
  { id: 'a1', name: 'Ana Checking', type: 'bank', current_balance: 10, owner_profile_id: 'ana' },
  { id: 'r1', name: 'Rui Wallet', type: 'cash', current_balance: 7, owner_profile_id: 'rui' },
  { id: 's1', name: 'Joint', type: 'bank', current_balance: 3, owner_profile_id: null },
];

function Harness({ initial = '' }) {
  const [value, setValue] = useState(initial);
  return (
    <GroupedAccountSelect
      label="Account"
      accounts={ACCOUNTS}
      members={MEMBERS}
      value={value}
      placeholder="Pick an account"
      onChange={setValue}
      hint="Where the money comes from"
      sharedLabel="Shared"
      closeLabel="Close"
      typeLabels={{ bank: 'Bank', cash: 'Cash' }}
    />
  );
}

function renderHarness(initial?: string) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>
        <Harness initial={initial} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('GroupedAccountSelect trigger', () => {
  it('shows the caller hint while nothing is selected', async () => {
    const view = await renderHarness();
    expect(view.getByText('Where the money comes from')).toBeTruthy();
  });

  it('shows the owner of a preselected account', async () => {
    const view = await renderHarness('a1');
    expect(view.getByText('Ana · Bank')).toBeTruthy();
    expect(view.queryByText('Where the money comes from')).toBeNull();
  });

  it('shows the shared label for an account without an owner', async () => {
    const view = await renderHarness('s1');
    expect(view.getByText('Shared · Bank')).toBeTruthy();
  });

  it('updates the owner after the user picks another account', async () => {
    const view = await renderHarness('a1');
    await fireEvent.press(view.getByText(/^Ana Checking ·/));
    await fireEvent.press(view.getByText('Rui Wallet'));
    expect(view.getByText('Rui · Cash')).toBeTruthy();
  });
});
