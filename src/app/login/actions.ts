"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.email();

function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}

export async function signInOwner(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const nextQuery = next === "/" ? "" : `&next=${encodeURIComponent(next)}`;
  if (!isSupabaseConfigured()) redirect(`/login?error=config${nextQuery}`);
  const parsed = z.object({ email: z.email(), password: z.string().min(8).max(72) }).safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) redirect(`/login?error=credentials${nextQuery}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(`/login?error=password${nextQuery}`);
  redirect(next);
}

export async function requestMagicLink(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const nextQuery = next === "/" ? "" : `&next=${encodeURIComponent(next)}`;

  if (!isSupabaseConfigured()) redirect(`/login?error=config${nextQuery}`);

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) redirect(`/login?error=email${nextQuery}`);

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    console.error("Supabase magic-link error", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    const errorCode = encodeURIComponent(error.code ?? "unknown");
    redirect(`/login?error=auth&code=${errorCode}${nextQuery}`);
  }
  redirect(`/login?sent=1${nextQuery}`);
}
