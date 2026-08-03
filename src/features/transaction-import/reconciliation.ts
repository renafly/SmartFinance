export function calculateReconciliation(input: { statementBalance: number; ledgerBalance: number; tolerance?: number }) {
  const difference = Number((input.statementBalance - input.ledgerBalance).toFixed(2));
  return { difference, reconciled: Math.abs(difference) <= (input.tolerance ?? 0.01) };
}
