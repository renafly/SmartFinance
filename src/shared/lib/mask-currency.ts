// Blurs a formatted currency string for "hide values" mode by swapping
// digits for dots while leaving the currency symbol, thousands separators,
// and decimal separator in place — reads as a redacted balance (e.g.
// "€•.•••,••") instead of a generic placeholder.
export function maskCurrencyText(formatted: string) {
  return formatted.replace(/[0-9]/g, '•');
}

export function displayCurrency(formatted: string, hideValues: boolean) {
  return hideValues ? maskCurrencyText(formatted) : formatted;
}
