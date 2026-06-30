// features/transactions/transaction.schema.ts
import { z } from "zod";

// NOTE: "transfer" is intentionally excluded here. Transfers are created via
// the `create_transfer` RPC (which writes two linked transaction rows), not
// through this form's single-row insert/update path.
export const transactionSchema = z.object({
  account_id: z.string().uuid({ message: "Please select an account" }),
  category_id: z.string().uuid().nullable(),

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