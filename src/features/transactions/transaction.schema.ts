// features/transactions/transaction.schema.ts
import { z } from "zod";
import { validateAllocations, type AllocationDraft } from "./utils/transaction-allocations";

// NOTE: "transfer" is intentionally excluded here. Transfers are created via
// the `create_transfer` RPC (which writes two linked transaction rows), not
// through this form's single-row insert/update path.
export const transactionSchema = z.object({
  account_id: z.uuid({ error: "Please select an account" }),
  category_id: z.uuid().nullable(),
  pot_id: z.uuid().nullable().optional(),

  type: z.enum(["income", "expense"], {
    error: "Please select a type",
  }),

  title: z
    .string()
    .min(1, "Title is required")
    .max(120, "Title is too long"),

  amount: z.coerce
    .number({ error: "Amount must be a number" })
    .positive("Amount must be greater than zero"),

  notes: z.string().max(1000).nullable().optional(),

  date: z.string().min(1, "Date is required"), // ISO date string, e.g. yyyy-mm-dd
});

// Input type = what the form fields hold (pre-validation, e.g. raw strings)
export type TransactionFormInput = z.input<typeof transactionSchema>;

// Output type = what you get after zodResolver parses it (used in onSubmit)
export type TransactionFormValues = z.output<typeof transactionSchema>;

// ============================================================
// Split source (transaction_allocations)
// ============================================================
// Kept separate from transactionSchema (rather than folding split fields
// into it) because the sum-to-total check needs the *other* field
// (`amount`) as context, and because the create/edit screen manages split
// state independently of the base fields today. `splitAllocationSchema`
// validates a single row's shape; the sum/duplicate/count checks that need
// every row at once live in `validateAllocations`
// (utils/transaction-allocations.ts) and are re-run here via superRefine so
// a schema-level parse gives the same verdict a form would show live.

export const splitAllocationSchema = z
  .object({
    id: z.string(),
    sourceType: z.enum(["account", "pot"]),
    accountId: z.string().nullable(),
    potId: z.string().nullable(),
    amount: z.coerce.number({ error: "Amount must be a number" }),
  })
  .refine(
    (allocation) =>
      allocation.sourceType === "account"
        ? Boolean(allocation.accountId) && !allocation.potId
        : Boolean(allocation.potId) && !allocation.accountId,
    { error: "Select an account or a pot for every allocation" },
  );

export const transactionSplitSchema = z
  .object({
    splitEnabled: z.boolean(),
    allocations: z.array(splitAllocationSchema),
  })
  .superRefine((value, ctx) => {
    if (!value.splitEnabled) return;

    // superRefine only has this object's own fields -- the transaction
    // total is threaded in by the caller via
    // `transactionSplitSchema.superRefine`'s 3rd arg is not available, so
    // callers should validate the total with `validateSplitAgainstTotal`
    // below instead of relying on this schema alone when splitEnabled.
    if (value.allocations.length < 2) {
      ctx.addIssue({
        code: "custom",
        message: "A split transaction requires at least two allocations.",
        path: ["allocations"],
      });
    }
  });

export type TransactionSplitFormValues = z.output<typeof transactionSplitSchema>;

/**
 * Full split validation against the transaction's total amount -- the
 * check `transactionSplitSchema` alone cannot express, since it has no
 * access to the sibling `amount` field. Returns an empty array when valid.
 */
export function validateSplitAgainstTotal(
  totalAmount: number,
  split: TransactionSplitFormValues,
) {
  if (!split.splitEnabled) return [];
  const allocations: AllocationDraft[] = split.allocations.map((allocation) => ({
    id: allocation.id,
    sourceType: allocation.sourceType,
    accountId: allocation.accountId,
    potId: allocation.potId,
    amount: allocation.amount,
  }));
  return validateAllocations(totalAmount, allocations);
}
