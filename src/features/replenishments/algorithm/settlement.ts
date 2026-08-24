// Pure settlement/rebalancing algorithm for the Sistema de Reposição.
// No React, no Supabase -- takes account-level cents totals in, returns the
// minimum real transfers needed to move the money out. Kept dependency-free
// so it's trivially unit-testable and safe to call from both the wizard's
// live preview and (if ever needed) a server-side context.

export type SettlementSource = { accountId: string; amountCents: number };
export type SettlementDestination = { accountId: string; amountCents: number };
export type SettlementTransfer = {
  sourceAccountId: string;
  destinationAccountId: string;
  amountCents: number;
};

export class SettlementError extends Error {}

type AccountRow = { accountId: string; amountCents: number };

function aggregateByAccount(rows: AccountRow[]): Map<string, number> {
  const byAccount = new Map<string, number>();
  for (const row of rows) {
    if (!Number.isInteger(row.amountCents) || row.amountCents < 0) {
      throw new SettlementError(
        `Amount for account ${row.accountId} must be a non-negative integer number of cents.`,
      );
    }
    if (row.amountCents === 0) continue;
    byAccount.set(row.accountId, (byAccount.get(row.accountId) ?? 0) + row.amountCents);
  }
  return byAccount;
}

function sumMapValues(map: Map<string, number>): number {
  let total = 0;
  for (const value of map.values()) total += value;
  return total;
}

/**
 * Computes the minimum number of real transfers needed to move money from
 * `sources` to `destinations`, where both sides are already expressed at
 * account granularity (a saving pot source must already be resolved to a
 * specific backing account before calling this -- see
 * ReplenishmentSourcesStep / resolvePotSource).
 *
 * This is a bipartite transportation problem: money only ever moves
 * source -> destination, never source -> source or destination ->
 * destination, because every real money movement in this app is a direct
 * transfer between two accounts (create_transfer / confirm_replenishment_run
 * never chain through an intermediate account). The greedy "largest
 * remaining source vs largest remaining destination" sweep below is bounded
 * by `m + n - 1` transfers -- every step fully exhausts at least one side,
 * and the very last step can exhaust both simultaneously -- which is the
 * standard minimal construction for this problem shape and is what keeps
 * the transfer count as low as possible without resorting to a naive
 * source×destination cross product.
 *
 * Deterministic: equal inputs (including account-id tie order) always
 * produce byte-identical output, in the same order -- required so a stored
 * preview can be compared against what confirm_replenishment_run is about
 * to insert, and so re-running after a manual edit doesn't reshuffle
 * transfers that didn't need to change.
 *
 * Throws SettlementError if the two sides don't sum to exactly the same
 * number of cents -- callers must validate/block this at the UI layer
 * ("remaining to allocate" / "over-allocated") rather than relying on this
 * function to clamp or silently drop the difference.
 */
export function computeMinimalTransfers(
  sources: SettlementSource[],
  destinations: SettlementDestination[],
): SettlementTransfer[] {
  const sourceTotals = aggregateByAccount(sources);
  const destinationTotals = aggregateByAccount(destinations);

  // Net out any account appearing on both sides against itself first. The
  // wizard is expected to already exclude "accounts to replenish" from the
  // source picker, but this function must stay correct even if a caller
  // doesn't enforce that -- and this is also the concrete "eliminate
  // redundant moves" step: a same-account overlap requires zero transfers
  // to resolve, not one.
  for (const accountId of [...sourceTotals.keys()]) {
    const destinationAmount = destinationTotals.get(accountId);
    if (destinationAmount === undefined) continue;

    const sourceAmount = sourceTotals.get(accountId)!;
    const netted = Math.min(sourceAmount, destinationAmount);
    if (netted <= 0) continue;

    const nextSource = sourceAmount - netted;
    const nextDestination = destinationAmount - netted;
    if (nextSource > 0) sourceTotals.set(accountId, nextSource);
    else sourceTotals.delete(accountId);
    if (nextDestination > 0) destinationTotals.set(accountId, nextDestination);
    else destinationTotals.delete(accountId);
  }

  const sourceTotal = sumMapValues(sourceTotals);
  const destinationTotal = sumMapValues(destinationTotals);
  if (sourceTotal !== destinationTotal) {
    throw new SettlementError(
      `Sources (${sourceTotal} cents) and destinations (${destinationTotal} cents) must sum to exactly the same amount.`,
    );
  }

  type Row = { accountId: string; remainingCents: number };

  const sortDescending = (rows: Row[]) =>
    rows.sort(
      (a, b) => b.remainingCents - a.remainingCents || a.accountId.localeCompare(b.accountId),
    );

  const remainingSources: Row[] = sortDescending(
    [...sourceTotals.entries()].map(([accountId, amountCents]) => ({
      accountId,
      remainingCents: amountCents,
    })),
  );
  const remainingDestinations: Row[] = sortDescending(
    [...destinationTotals.entries()].map(([accountId, amountCents]) => ({
      accountId,
      remainingCents: amountCents,
    })),
  );

  const transfers: SettlementTransfer[] = [];

  while (remainingSources.length > 0 && remainingDestinations.length > 0) {
    const source = remainingSources[0];
    const destination = remainingDestinations[0];
    const amountCents = Math.min(source.remainingCents, destination.remainingCents);

    transfers.push({
      sourceAccountId: source.accountId,
      destinationAccountId: destination.accountId,
      amountCents,
    });

    source.remainingCents -= amountCents;
    destination.remainingCents -= amountCents;

    if (source.remainingCents === 0) remainingSources.shift();
    if (destination.remainingCents === 0) remainingDestinations.shift();

    // Re-sorting the small remainder each iteration (rather than
    // incrementally re-inserting) keeps the "largest remaining vs largest
    // remaining" invariant exact with negligible cost at the scale this
    // feature operates at (a household's accounts/pots, never more than a
    // handful of rows per side).
    sortDescending(remainingSources);
    sortDescending(remainingDestinations);
  }

  return transfers;
}
