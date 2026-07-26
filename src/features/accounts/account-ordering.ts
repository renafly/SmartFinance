export const ACCOUNT_TYPE_ORDER = [
  "bank",
  "cash",
  "savings",
  "credit_card",
  "investment",
  "ppr",
] as const;

export const SHARED_ACCOUNT_OWNER_KEY = "__shared__";

type OrderedAccount = {
  name: string;
  type: string;
  owner_profile_id: string | null;
};

function getAccountTypeRank(type: string) {
  const rank = ACCOUNT_TYPE_ORDER.indexOf(
    type as (typeof ACCOUNT_TYPE_ORDER)[number],
  );
  return rank === -1 ? ACCOUNT_TYPE_ORDER.length : rank;
}

export function getAccountOwnerKey(
  account: Pick<OrderedAccount, "owner_profile_id">,
) {
  return account.owner_profile_id ?? SHARED_ACCOUNT_OWNER_KEY;
}

export function getAccountOwnerToneIndex(
  ownerProfileId: string | null | undefined,
  ownerOrder: readonly string[],
  toneCount: number,
) {
  if (toneCount <= 0) return 0;

  const ownerKey = ownerProfileId ?? SHARED_ACCOUNT_OWNER_KEY;
  const ownerRank = ownerOrder.indexOf(ownerKey);
  const normalizedRank = ownerRank === -1 ? ownerOrder.length : ownerRank;

  return normalizedRank % toneCount;
}

export function compareAccountsByTypeThenName(
  left: Pick<OrderedAccount, "name" | "type">,
  right: Pick<OrderedAccount, "name" | "type">,
) {
  return (
    getAccountTypeRank(left.type) - getAccountTypeRank(right.type) ||
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
  );
}

export function compareAccountsByOwnerThenType(
  left: OrderedAccount,
  right: OrderedAccount,
  ownerOrder: readonly string[],
) {
  const leftOwner = getAccountOwnerKey(left);
  const rightOwner = getAccountOwnerKey(right);
  const leftRank = ownerOrder.indexOf(leftOwner);
  const rightRank = ownerOrder.indexOf(rightOwner);
  const normalizedLeftRank = leftRank === -1 ? ownerOrder.length : leftRank;
  const normalizedRightRank = rightRank === -1 ? ownerOrder.length : rightRank;

  return (
    normalizedLeftRank - normalizedRightRank ||
    leftOwner.localeCompare(rightOwner, undefined, { sensitivity: "base" }) ||
    compareAccountsByTypeThenName(left, right)
  );
}

export function groupAccountsByOwner<T extends OrderedAccount>(
  accounts: readonly T[],
  ownerOrder: readonly string[],
) {
  const groups = new Map<string, T[]>();
  const orderedAccounts = [...accounts].sort((left, right) =>
    compareAccountsByOwnerThenType(left, right, ownerOrder),
  );

  for (const account of orderedAccounts) {
    const ownerKey = getAccountOwnerKey(account);
    const ownerAccounts = groups.get(ownerKey);

    if (ownerAccounts) {
      ownerAccounts.push(account);
    } else {
      groups.set(ownerKey, [account]);
    }
  }

  return [...groups].map(([key, groupedAccounts]) => ({
    key,
    accounts: groupedAccounts,
  }));
}
