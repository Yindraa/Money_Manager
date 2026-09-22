"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createLinkSchema = z.object({
  bookId: z.uuid(),
  role: z.enum(["editor", "viewer"]),
  expiresInDays: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  maxUses: z.union([z.literal(1), z.literal(5), z.literal(10), z.null()]),
});

const memberSchema = z.object({
  bookId: z.uuid(),
  userId: z.uuid(),
});

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) throw new Error("Anda harus masuk terlebih dahulu.");
  return { supabase, userId };
}

function revalidateSharing() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/settings");
}

export async function createShareLink(input: unknown) {
  const values = createLinkSchema.parse(input);
  const { supabase, userId } = await authenticatedClient();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + values.expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("share_links")
    .insert({
      book_id: values.bookId,
      token_hash: tokenHash,
      role: values.role,
      expires_at: expiresAt,
      max_uses: values.maxUses,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  revalidateSharing();
  return { id: data.id, url: `${siteUrl}/share/${rawToken}` };
}

export async function revokeShareLink(id: string, bookId: string) {
  const linkId = z.uuid().parse(id);
  const parsedBookId = z.uuid().parse(bookId);
  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("book_id", parsedBookId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Link tidak ditemukan atau Anda tidak memiliki akses.");
  revalidateSharing();
}

export async function updateShareLinkRole(id: string, bookId: string, role: unknown) {
  const linkId = z.uuid().parse(id);
  const parsedBookId = z.uuid().parse(bookId);
  const parsedRole = z.enum(["editor", "viewer"]).parse(role);
  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase
    .from("share_links")
    .update({ role: parsedRole })
    .eq("id", linkId)
    .eq("book_id", parsedBookId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Link tidak ditemukan atau Anda tidak memiliki akses.");
  revalidateSharing();
}

export async function updateMemberRole(input: unknown) {
  const values = memberSchema.extend({ role: z.enum(["editor", "viewer"]) }).parse(input);
  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase
    .from("book_members")
    .update({ role: values.role })
    .eq("book_id", values.bookId)
    .eq("user_id", values.userId)
    .select("user_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Anggota tidak ditemukan atau Anda tidak memiliki akses.");
  revalidateSharing();
}

export async function removeBookMember(input: unknown) {
  const values = memberSchema.parse(input);
  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase
    .from("book_members")
    .delete()
    .eq("book_id", values.bookId)
    .eq("user_id", values.userId)
    .select("user_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Anggota tidak ditemukan atau Anda tidak memiliki akses.");
  revalidateSharing();
}

export async function acceptShareLink(rawToken: string) {
  const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/).parse(rawToken);
  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase.rpc("accept_share_link", { raw_token: token });

  if (error) throw new Error(error.message);
  revalidateSharing();
  return { bookId: String(data) };
}
