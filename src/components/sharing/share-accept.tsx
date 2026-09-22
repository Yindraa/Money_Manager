"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Users } from "lucide-react";
import { acceptShareLink } from "@/app/actions/sharing";
import { createClient } from "@/lib/supabase/client";

export function ShareAccept({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function accept() {
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data: claims } = await supabase.auth.getClaims();
        if (!claims?.claims?.sub) {
          const { error: anonymousError } = await supabase.auth.signInAnonymously();
          if (anonymousError) throw anonymousError;
        }
        const result = await acceptShareLink(token);
        router.push(`/?book=${encodeURIComponent(result.bookId)}`);
      } catch (acceptError) {
        const message = acceptError instanceof Error ? acceptError.message : "Undangan tidak dapat diterima.";
        setError(message.includes("Invalid or expired") ? "Link undangan tidak valid, sudah kedaluwarsa, atau telah dicabut." : message);
      }
    });
  }

  return <main className="grid min-h-screen place-items-center bg-[#f3f5f1] px-4 py-10">
    <section className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
      <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Users size={23} /></span>
      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Undangan Dompetku</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Buka buku bersama</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">Buka akses sementara langsung dari link ini, tanpa email atau password. Hak akses dan masa berlakunya ditentukan oleh owner.</p>
      {error && <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}
      <button type="button" onClick={accept} disabled={isPending} className="primary-button mt-7 w-full">{isPending ? "Menyiapkan akses..." : "Buka buku bersama"}<ArrowRight size={17} /></button>
      <p className="mt-4 text-center text-xs leading-5 text-slate-400">Akses tersimpan pada browser ini sampai kedaluwarsa. Jangan bagikan link kepada orang yang tidak dituju.</p>
    </section>
  </main>;
}
