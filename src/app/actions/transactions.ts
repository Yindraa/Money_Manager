"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validation/transaction";

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) throw new Error("Anda harus masuk terlebih dahulu.");
  return { supabase, userId };
}

export async function createTransaction(input: unknown) {
  const values = transactionSchema.parse(input);
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      book_id: values.bookId,
      transaction_date: values.transactionDate,
      description: values.description,
      category_id: values.categoryId,
      type: values.type,
      amount: values.amount,
      payment_method_id: values.paymentMethodId,
      notes: values.notes || null,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/transactions");
  return { id: data.id };
}

export async function updateTransaction(id: string, input: unknown) {
  const transactionId = zUuid(id);
  const values = transactionSchema.parse(input);
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({
      transaction_date: values.transactionDate,
      description: values.description,
      category_id: values.categoryId,
      type: values.type,
      amount: values.amount,
      payment_method_id: values.paymentMethodId,
      notes: values.notes || null,
      updated_by: userId,
    })
    .eq("id", transactionId)
    .eq("book_id", values.bookId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Transaksi tidak ditemukan atau Anda tidak memiliki akses.");
  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function deleteTransaction(id: string) {
  const transactionId = zUuid(id);
  const { supabase } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Transaksi tidak ditemukan atau Anda tidak memiliki akses.");
  revalidatePath("/");
  revalidatePath("/transactions");
}

function zUuid(value: string) {
  return transactionSchema.shape.bookId.parse(value);
}
