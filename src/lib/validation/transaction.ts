import { z } from "zod";

export const transactionSchema = z.object({
  bookId: z.uuid(),
  transactionDate: z.iso.date(),
  description: z.string().trim().min(2).max(160),
  categoryId: z.uuid(),
  type: z.enum(["expense", "income"]),
  amount: z.coerce.number().positive().max(999_999_999_999),
  paymentMethodId: z.uuid(),
  notes: z.string().trim().max(1_000).optional().nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
