"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign, WalletCards } from "lucide-react";
import { createBook } from "@/app/actions/books";
import { useToast } from "@/components/ui/toast-provider";

export function Onboarding({ profileName, month }: { profileName: string; month: string }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await toast.track(() => createBook({
          name: form.get("name"),
          month,
          openingBalance: form.get("openingBalance"),
        }), { loading: "Membuat buku keuangan...", success: "Buku keuangan berhasil dibuat." });
        router.refresh();
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : "Buku keuangan gagal dibuat.");
      }
    });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f5f1] px-4 py-10">
      <section className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
        <div className="grid size-12 place-items-center rounded-2xl bg-[#123c32] text-white"><WalletCards size={24} /></div>
        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Langkah pertama</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Halo, {profileName}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Buat buku keuangan pertama dan tentukan dana awal bulan ini.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          <label className="form-label">Nama buku
            <input name="name" className="form-input mt-2" defaultValue="Keuangan Pribadi" required minLength={2} maxLength={80} />
          </label>
          <label className="form-label">Dana awal bulan
            <div className="relative mt-2">
              <CircleDollarSign className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input name="openingBalance" className="form-input form-input-leading text-lg font-semibold" type="number" inputMode="numeric" min="0" step="1" placeholder="0" required />
            </div>
          </label>
          <button className="primary-button w-full" disabled={isPending} type="submit">{isPending ? "Membuat buku..." : "Mulai mencatat"}</button>
        </form>
      </section>
    </main>
  );
}
