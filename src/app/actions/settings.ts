"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid();
const name = z.string().trim().min(1).max(60);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) throw new Error("Anda harus masuk terlebih dahulu.");
  return { supabase, userId };
}

function revalidateMoneyManager() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/settings");
}

export async function updateProfileName(value: unknown) {
  const displayName = z.string().trim().min(2).max(80).parse(value);
  const { supabase, userId } = await authenticatedClient();
  const { data, error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", userId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profil tidak ditemukan.");
  revalidateMoneyManager();
}

export async function updateBookName(bookId: string, value: unknown) {
  const id = uuid.parse(bookId);
  const bookName = z.string().trim().min(2).max(80).parse(value);
  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase.from("books").update({ name: bookName }).eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Hanya owner yang dapat mengubah nama buku.");
  revalidateMoneyManager();
}

export async function setOwnerPassword(input: unknown) {
  const values = z.object({
    bookId: uuid,
    password: z.string().min(8, "Password minimal 8 karakter.").max(72),
    confirmation: z.string(),
  }).refine((value) => value.password === value.confirmation, { message: "Konfirmasi password tidak sama." }).parse(input);
  const { supabase, userId } = await authenticatedClient();
  const { data: book, error: bookError } = await supabase.from("books").select("id").eq("id", values.bookId).eq("owner_id", userId).maybeSingle();
  if (bookError) throw new Error(bookError.message);
  if (!book) throw new Error("Hanya owner yang dapat mengatur password akun ini.");
  const { error } = await supabase.auth.updateUser({ password: values.password });
  if (error) throw new Error(error.message);
}

export async function createCategory(input: unknown) {
  const values = z.object({ bookId: uuid, name, color }).parse(input);
  const { supabase } = await authenticatedClient();
  const { error } = await supabase.from("categories").insert({ book_id: values.bookId, name: values.name, color: values.color });
  if (error) throw new Error(error.message);
  revalidateMoneyManager();
}

export async function updateCategory(input: unknown) {
  const values = z.object({ bookId: uuid, id: uuid, name, color, isActive: z.boolean() }).parse(input);
  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase.from("categories").update({ name: values.name, color: values.color, is_active: values.isActive }).eq("id", values.id).eq("book_id", values.bookId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Kategori tidak ditemukan atau Anda tidak memiliki akses.");
  revalidateMoneyManager();
}

export async function createPaymentMethod(input: unknown) {
  const values = z.object({ bookId: uuid, name: z.string().trim().min(1).max(40) }).parse(input);
  const { supabase } = await authenticatedClient();
  const { error } = await supabase.from("payment_methods").insert({ book_id: values.bookId, name: values.name });
  if (error) throw new Error(error.message);
  revalidateMoneyManager();
}

export async function updatePaymentMethod(input: unknown) {
  const values = z.object({ bookId: uuid, id: uuid, name: z.string().trim().min(1).max(40), isActive: z.boolean() }).parse(input);
  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase.from("payment_methods").update({ name: values.name, is_active: values.isActive }).eq("id", values.id).eq("book_id", values.bookId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Metode pembayaran tidak ditemukan atau Anda tidak memiliki akses.");
  revalidateMoneyManager();
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
