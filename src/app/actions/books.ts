"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bookSchema = z.object({
  name: z.string().trim().min(2).max(80),
  month: z.iso.date(),
  openingBalance: z.coerce.number().nonnegative().max(999_999_999_999),
});

export async function createBook(input: unknown) {
  const values = bookSchema.parse(input);
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    throw new Error("Anda harus masuk terlebih dahulu.");
  }

  const { data, error } = await supabase.rpc("create_book_with_opening_balance", {
    book_name: values.name,
    start_month: values.month,
    opening_balance: values.openingBalance,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return { id: data as string };
}
