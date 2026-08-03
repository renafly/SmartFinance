export function normalizeTransactionTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function transactionTitleTokens(value: string): string[] {
  return normalizeTransactionTitle(value)
    .split(" ")
    .filter((token) => token.length > 1);
}
