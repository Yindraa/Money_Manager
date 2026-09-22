"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const openingBalanceSchema = z.object({
  bookId: z.uuid(),
  month: z.iso.date().refine((value) => value.endsWith("-01"), "Bulan tidak valid."),
  openingBalance: z.coerce.number().nonnegative().max(999_999_999_999),
});

export async function setOpeningBalance(input: unknown) {
  const values = openingBalanceSchema.parse(input);
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (authError || !userId) throw new Error("Anda harus masuk terlebih dahulu.");

  const { data: period, error: lookupError } = await supabase
    .from("monthly_periods")
    .select("id")
    .eq("book_id", values.bookId)
    .eq("month", values.month)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  if (period) {
    const { data, error } = await supabase
      .from("monthly_periods")
      .update({ opening_balance: values.openingBalance })
      .eq("id", period.id)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Periode tidak ditemukan atau Anda tidak memiliki akses.");
  } else {
    const { error } = await supabase.from("monthly_periods").insert({
      book_id: values.bookId,
      month: values.month,
      opening_balance: values.openingBalance,
      created_by: userId,
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/transactions");
}
