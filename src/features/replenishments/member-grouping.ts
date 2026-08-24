// Shared "group by household member" logic for the replenishment wizard.
// Used identically by the accounts-to-replenish step, the transactions
// step, and the sources step so all three present the same member/"Shared"
// breakdown instead of three slightly different groupings.

/** Bucket key for accounts/pots/transactions that don't belong to a single
 * member -- a shared account, or a saving pot backed by accounts owned by
 * more than one member (or by no one in particular). */
export const SHARED_MEMBER_KEY = "__shared__";

export type MemberLabelInfo = {
  userId: string;
  fullName: string | null;
  email: string | null;
};

/** Resolves each member's display label once (full name, falling back to
 * email, falling back to the caller-supplied "unnamed user" copy) so every
 * step shows the exact same name for the exact same person. */
export function buildMemberLabelMap(
  members: MemberLabelInfo[],
  unnamedLabel: string,
): Map<string, string> {
  return new Map(
    members.map((member) => [
      member.userId,
      member.fullName?.trim() || member.email || unnamedLabel,
    ]),
  );
}

export function accountMemberKey(account: { owner_profile_id?: string | null }): string {
  return account.owner_profile_id ?? SHARED_MEMBER_KEY;
}

/**
 * A saving pot has no owner of its own -- only its backing accounts do --
 * so a pot's "member" is the single owner shared by every one of its
 * backing accounts. A pot with no accounts yet, or whose accounts belong to
 * more than one member (including any shared account), falls into the
 * shared bucket: there's no single person it would be fair to attribute it
 * to.
 */
export function potMemberKey(
  potAccountIds: string[],
  accountOwnerById: Map<string, string | null>,
): string {
  if (potAccountIds.length === 0) return SHARED_MEMBER_KEY;
  const owners = new Set(
    potAccountIds.map((id) => accountOwnerById.get(id) ?? SHARED_MEMBER_KEY),
  );
  return owners.size === 1 ? [...owners][0]! : SHARED_MEMBER_KEY;
}

export type MemberSectionMeta = { key: string; label: string };

/**
 * Orders the member sections to render: real members alphabetically by
 * their resolved label, with the shared bucket always last (it's a
 * catch-all, not "someone", so it reads better at the end regardless of
 * where its label would otherwise sort).
 */
export function orderMemberSections(
  keys: Iterable<string>,
  memberLabelMap: Map<string, string>,
  sharedLabel: string,
): MemberSectionMeta[] {
  const unique = [...new Set(keys)];
  const sections = unique.map((key) => ({
    key,
    label: key === SHARED_MEMBER_KEY ? sharedLabel : memberLabelMap.get(key) ?? sharedLabel,
  }));

  sections.sort((a, b) => {
    if (a.key === SHARED_MEMBER_KEY) return 1;
    if (b.key === SHARED_MEMBER_KEY) return -1;
    return a.label.localeCompare(b.label);
  });

  return sections;
}
