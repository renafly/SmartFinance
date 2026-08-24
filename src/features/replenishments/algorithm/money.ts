// Shared cents-precision helpers. All replenishment math (the settlement
// algorithm, live "remaining to allocate" banners, etc.) happens in integer
// cents to avoid floating point drift, converting to/from the DB's
// numeric(14,2) amounts only at the UI/repository boundary.

/** Converts a decimal currency amount (e.g. 33.33) to integer cents (3333). */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/** Converts integer cents (3333) back to a decimal currency amount (33.33). */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function sumCents(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
