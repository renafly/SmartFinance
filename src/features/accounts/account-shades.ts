import { mixHexColors } from "@/shared/lib/color";

import { getAccountOwnerKey } from "./account-ordering";

/** A row tone as used by the transaction lists: `accent` is the left
 * stripe, `surface` the row background. */
export type AccountTone = { accent: string; surface: string };

type ShadeableAccount = {
  id: string | null;
  owner_profile_id: string | null;
  created_at?: string | null;
};

type ShadePalette = { text: string; surface: string };

/**
 * The shade ladder applied on top of an account owner's base tone, so every
 * account of the same member reads as a variant of that member's colour
 * rather than a new colour of its own.
 *
 * - `accent`: how far the stripe moves away from the owner's accent --
 *   positive toward the theme's text colour (a deeper stripe in light
 *   themes, a brighter one in dark themes), negative toward the plain
 *   surface (a softer stripe).
 * - `surface`: how far the row background moves from the owner's soft tint
 *   toward the plain surface (0 = the owner's full tint).
 *
 * The row background is only ever moved toward the plain surface, never
 * deeper into the accent: the owner tints already sit close to the minimum
 * text contrast, and tinting them further would push secondary text and
 * the red/green amounts below it (checked for every theme and owner tone in
 * account-shades.unit.test.ts). Index 0 is the owner's tone unchanged, so a
 * member's first account looks exactly as before. Consecutive steps change
 * the stripe and the tint in opposite directions so neighbouring accounts
 * stay easy to tell apart.
 */
export const ACCOUNT_SHADE_STEPS = [
  { accent: 0, surface: 0 },
  { accent: 0.35, surface: 0.5 },
  { accent: 0.55, surface: 0 },
  { accent: -0.2, surface: 0.75 },
] as const;

function compareForShade(left: ShadeableAccount, right: ShadeableAccount) {
  const leftCreated = left.created_at ?? "";
  const rightCreated = right.created_at ?? "";
  // Accounts without a creation date go after dated ones, so they never
  // shift the shade of an existing, dated account.
  if (leftCreated !== rightCreated) {
    if (!leftCreated) return 1;
    if (!rightCreated) return -1;
    return leftCreated < rightCreated ? -1 : 1;
  }
  return (left.id ?? "").localeCompare(right.id ?? "");
}

/**
 * Deterministic account -> shade index map. Accounts are ranked inside their
 * owner group (the shared group included) by creation date, then id, so:
 * - a member's accounts always get different shades (until there are more
 *   accounts than shades, after which the ladder repeats);
 * - renaming an account, or changing its type, never changes its shade;
 * - a newly created account takes the next free shade without changing any
 *   existing account's shade.
 * Pass the full account list (archived accounts included) so archiving an
 * account doesn't shift the shades of the others.
 */
export function buildAccountShadeIndexMap(
  accounts: readonly ShadeableAccount[],
): Map<string, number> {
  const byOwner = new Map<string, ShadeableAccount[]>();
  for (const account of accounts) {
    if (!account.id) continue;
    const ownerKey = getAccountOwnerKey(account);
    const group = byOwner.get(ownerKey);
    if (group) group.push(account);
    else byOwner.set(ownerKey, [account]);
  }

  const shadeById = new Map<string, number>();
  for (const group of byOwner.values()) {
    group.sort(compareForShade);
    group.forEach((account, index) => {
      shadeById.set(account.id!, index % ACCOUNT_SHADE_STEPS.length);
    });
  }
  return shadeById;
}

/**
 * Applies shade `shadeIndex` to an owner's base tone. An unknown account
 * (index undefined, e.g. not in the loaded account list) falls back to the
 * owner's base tone.
 */
export function getAccountShadeTone(
  ownerTone: AccountTone,
  shadeIndex: number | undefined,
  palette: ShadePalette,
): AccountTone {
  const step =
    ACCOUNT_SHADE_STEPS[
      (((shadeIndex ?? 0) % ACCOUNT_SHADE_STEPS.length) + ACCOUNT_SHADE_STEPS.length) %
        ACCOUNT_SHADE_STEPS.length
    ];

  const accent =
    step.accent >= 0
      ? mixHexColors(ownerTone.accent, palette.text, step.accent)
      : mixHexColors(ownerTone.accent, palette.surface, -step.accent);
  const surface = mixHexColors(ownerTone.surface, palette.surface, step.surface);

  return { accent, surface };
}
