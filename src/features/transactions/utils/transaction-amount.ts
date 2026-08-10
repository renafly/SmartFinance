export type MovementKind = "income" | "expense" | "transfer";

type MovementLike = {
  movement_kind?: string | null;
  type?: string | null;
};

/**
 * Resolves whether a transaction/movement row is an expense, income, or
 * transfer using the data model's own `movement_kind` (rows from the
 * `list_transaction_movements` RPC) or `type` (raw `transactions` table
 * rows) field — never the stored amount's numeric sign.
 *
 * `transactions.amount` is always stored as a positive number (DB check
 * constraint `amount > 0`), so the sign can never be inferred from the
 * number itself; only this field tells expense and income apart.
 */
export function resolveMovementKind(item: MovementLike): MovementKind {
  const kind = item.movement_kind ?? item.type;
  if (kind === "transfer") return "transfer";
  return kind === "expense" ? "expense" : "income";
}

/**
 * The sign to prefix a formatted currency amount with when displaying a
 * transaction/movement row. Transfers show no sign at the list level since a
 * single row doesn't have one direction (source leg leaves an account,
 * destination leg arrives in another).
 */
export function movementAmountSign(kind: MovementKind): "" | "-" | "+" {
  if (kind === "transfer") return "";
  return kind === "expense" ? "-" : "+";
}

type MovementColorPalette = {
  destructive: string;
  success: string;
  financialNeutral: string;
};

/** The text color for a movement row's signed amount. */
export function movementAmountColor(
  kind: MovementKind,
  colors: MovementColorPalette,
): string {
  if (kind === "transfer") return colors.financialNeutral;
  return kind === "expense" ? colors.destructive : colors.success;
}

type MovementIconPalette = MovementColorPalette & {
  destructiveSoft: string;
  successSoft: string;
  surface: string;
};

/** The icon badge background for a movement row. */
export function movementIconBackground(
  kind: MovementKind,
  colors: MovementIconPalette,
): string {
  if (kind === "transfer") return colors.surface;
  return kind === "expense" ? colors.destructiveSoft : colors.successSoft;
}
