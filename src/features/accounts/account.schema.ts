import { z } from "zod";

export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Account name is required"),

  type: z.enum([
    "bank",
    "cash",
    "credit_card",
    "investment",
    "savings",
  ]),

  currency: z.enum(["EUR", "USD", "GBP"]),

  initial_balance: z.coerce
    .number()
    .min(0, "Balance cannot be negative"),
});

export type AccountFormInput = z.input<typeof accountSchema>;
export type AccountFormValues = z.output<typeof accountSchema>;