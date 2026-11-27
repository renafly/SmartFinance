import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import '@/config/i18n';
import i18n from '@/config/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { GroupedAccountFilterSelect } from './grouped-account-select';

jest.mock('@/components/bug-report-fab', () => ({ BugReportFab: () => null }));
// The first render loads the whole theme/i18n/modal stack, which can be slow.
jest.setTimeout(60000);

const MEMBERS = [
  { userId: 'ana', fullName: 'Ana', email: null },
  { userId: 'rui', fullName: 'Rui', email: null },
];
const ACCOUNTS = [
  { id: 'a1', name: 'Ana Checking', type: 'bank', current_balance: 10, owner_profile_id: 'ana' },
  { id: 'a2', name: 'Ana Wallet', type: 'cash', current_balance: 5, owner_profile_id: 'ana' },
  { id: 'r1', name: 'Rui Checking', type: 'bank', current_balance: 7, owner_profile_id: 'rui' },
];

let latest: string[] = [];

function Harness({ initial = [] as string[] }) {
  const [values, setValues] = useState<string[]>(initial);
  latest = values;
  return (
    <GroupedAccountFilterSelect
      label="Account"
      accounts={ACCOUNTS}
      members={MEMBERS}
      values={values}
      onChange={setValues}
      allLabel="All accounts"
      getSelectedCountLabel={(count) => `${count} accounts`}
      closeLabel="Close"
      confirmLabel="Apply"
    />
  );
}

async function renderHarness(initial?: string[]) {
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

describe('GroupedAccountFilterSelect', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('selects several accounts independently and applies them together', async () => {
    const view = await renderHarness();
    expect(view.getByText('All accounts')).toBeTruthy();

    await fireEvent.press(view.getByText('All accounts'));
    await fireEvent.press(view.getByText('Ana Checking'));
    await fireEvent.press(view.getByText('Rui Checking'));
    // Nothing changes until Apply.
    expect(latest).toEqual([]);
    await fireEvent.press(view.getByText('Apply'));

    expect(latest).toEqual(['a1', 'r1']);
    expect(view.getByText('2 accounts')).toBeTruthy();
  });

  it('reopens with the current selection, so removing one keeps the others', async () => {
    const view = await renderHarness(['a1', 'a2', 'r1']);
    expect(view.getByText('3 accounts')).toBeTruthy();

    await fireEvent.press(view.getByText('3 accounts'));
    await fireEvent.press(view.getByText('Ana Wallet'));
    await fireEvent.press(view.getByText('Apply'));

    expect(latest).toEqual(['a1', 'r1']);
  });

  it('shows a single selection like the single-account picker', async () => {
    const view = await renderHarness(['a1']);
    expect(view.getByText(/^Ana Checking · /)).toBeTruthy();
  });

  it('clears everything via "All accounts" or by applying an empty selection', async () => {
    const view = await renderHarness(['a1', 'r1']);

    await fireEvent.press(view.getByText('2 accounts'));
    // The "all accounts" row inside the picker.
    await fireEvent.press(view.getByText('All accounts'));
    await fireEvent.press(view.getByText('Apply'));
    expect(latest).toEqual([]);
    expect(view.getByText('All accounts')).toBeTruthy();
  });

  it('discards unapplied changes on close', async () => {
    const view = await renderHarness(['a1']);

    await fireEvent.press(view.getByText(/^Ana Checking · /));
    await fireEvent.press(view.getByText('Rui Checking'));
    await fireEvent.press(view.getAllByText('Close')[0]);

    expect(latest).toEqual(['a1']);
  });
});
