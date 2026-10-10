import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import '@/config/i18n';
import i18n from '@/config/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { MemberDropdownList } from './MemberDropdownList';
import type { MemberGroup } from './MemberGroupedList';

jest.mock('@/components/bug-report-fab', () => ({ BugReportFab: () => null }));

const OWNERS = {
  ana: [
    { id: 'a1', name: 'Ana Checking' },
    { id: 'a2', name: 'Ana Savings' },
    { id: 'a3', name: 'Ana Wallet' },
  ],
  rui: [{ id: 'r1', name: 'Rui Checking' }],
};

let latestSelection: string[] = [];

function Harness() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  latestSelection = [...selected];
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const groups: MemberGroup[] = Object.entries(OWNERS).map(([key, accounts]) => ({
    key,
    label: key === 'ana' ? 'Ana' : 'Rui',
    primary: accounts.map((account) => ({
      id: account.id,
      title: account.name,
      active: selected.has(account.id),
      onPress: () => toggle(account.id),
    })),
  }));

  return <MemberDropdownList title="Accounts to replenish" groups={groups} emptyLabel="None" />;
}

describe('MemberDropdownList', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('multi-selects per member, keeps the dropdown open, and deselects via chips', async () => {
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
      >
        <ThemeProvider>
          <Harness />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    // Closed: one compact trigger per member, nothing listed yet.
    expect(view.getByText('Ana')).toBeTruthy();
    expect(view.getByText('Rui')).toBeTruthy();
    expect(view.getAllByText('Select accounts')).toHaveLength(2);
    expect(view.queryByText('Ana Checking')).toBeNull();

    // Open Ana's dropdown: only Ana's accounts are offered.
    await fireEvent.press(view.getAllByText('Select accounts')[0]);
    expect(view.getByText('Ana Checking')).toBeTruthy();
    expect(view.queryByText('Rui Checking')).toBeNull();

    // Several taps without the dropdown closing.
    await fireEvent.press(view.getByText('Ana Checking'));
    await fireEvent.press(view.getByText('Ana Savings'));
    await fireEvent.press(view.getByText('Ana Wallet'));
    expect(view.getByText('Ana Wallet')).toBeTruthy();
    expect(latestSelection.sort()).toEqual(['a1', 'a2', 'a3']);

    await fireEvent.press(view.getByText('Done'));
    expect(view.getByText('3 selected')).toBeTruthy();

    // Rui's selection is independent of Ana's.
    await fireEvent.press(view.getByText('Select accounts'));
    await fireEvent.press(view.getByText('Rui Checking'));
    await fireEvent.press(view.getByText('Done'));
    expect(latestSelection.sort()).toEqual(['a1', 'a2', 'a3', 'r1']);

    // Chips: remove one account individually.
    await fireEvent.press(view.getByLabelText('Remove Ana Savings'));
    expect(latestSelection.sort()).toEqual(['a1', 'a3', 'r1']);
    expect(view.getByText('Ana Checking, Ana Wallet')).toBeTruthy();
  });
});
