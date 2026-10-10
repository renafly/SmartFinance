import { groupImpactsByOwner } from './ui-utils';

describe('groupImpactsByOwner', () => {
  const accountsById = new Map([
    ['activo', { owner_profile_id: 'u2' }],
    ['t212', { owner_profile_id: 'u2' }],
    ['revolut', { owner_profile_id: 'u1' }],
    ['xtb', { owner_profile_id: 'u1' }],
    ['joint', { owner_profile_id: null }],
  ]);
  const names: Record<string, string> = { u1: 'Ana', u2: 'Bruno' };
  const ownerLabel = (id: string | null) => (id ? names[id] : 'Shared');

  it('groups by owner, people alphabetical then shared, keeping amounts and order untouched', () => {
    const impacts = [
      { accountId: 'joint', after: 10 },
      { accountId: 'activo', after: 2000 },
      { accountId: 'xtb', after: 3000 },
      { accountId: 't212', after: 1500 },
      { accountId: 'revolut', after: 500 },
    ];
    const groups = groupImpactsByOwner(impacts, accountsById, ownerLabel);
    expect(groups.map((g) => g.label)).toEqual(['Ana', 'Bruno', 'Shared']);
    expect(groups[0].impacts).toEqual([{ accountId: 'xtb', after: 3000 }, { accountId: 'revolut', after: 500 }]);
    expect(groups[1].impacts.map((i) => i.accountId)).toEqual(['activo', 't212']);
    expect(groups[2]).toMatchObject({ isShared: true, ownerProfileId: null });
    expect(groups.flatMap((g) => g.impacts)).toHaveLength(impacts.length);
  });

  it('treats unknown accounts as shared', () => {
    const groups = groupImpactsByOwner([{ accountId: 'missing' }], accountsById, ownerLabel);
    expect(groups).toEqual([{ key: '__shared__', ownerProfileId: null, label: 'Shared', isShared: true, impacts: [{ accountId: 'missing' }] }]);
  });
});
