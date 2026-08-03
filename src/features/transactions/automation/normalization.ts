export function normalizeMerchantText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function canonicalizeMerchant(
  title: string,
  aliases: readonly { normalized_alias: string; merchant_name: string }[],
): string | null {
  const normalizedTitle = normalizeMerchantText(title);
  if (!normalizedTitle) return null;

  const match = aliases.find(
    (alias) =>
      normalizeMerchantText(alias.normalized_alias) === normalizedTitle,
  );
  return match?.merchant_name.trim() || null;
}
