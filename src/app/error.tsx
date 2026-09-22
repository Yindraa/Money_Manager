"use client";

import Link from "next/link";
import { CircleAlert, RotateCcw, WalletCards } from "lucide-react";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-[#f3f5f1] px-4 py-10 text-slate-950">
    <section className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-900/5 sm:p-10">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#123c32] text-white"><WalletCards size={23} /></span>
      <span className="mx-auto mt-7 grid size-11 place-items-center rounded-2xl bg-red-50 text-red-600"><CircleAlert size={21} /></span>
      <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Data belum berhasil dimuat</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">Koneksi ke layanan data mungkin sedang terganggu. Catatan keuangan Anda tetap aman dan Anda dapat mencoba memuatnya kembali.</p>
      {error.digest && <p className="mt-4 text-xs text-slate-400">Referensi error: {error.digest}</p>}
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={retry} className="primary-button"><RotateCcw size={16} /> Coba lagi</button>
        <Link href="/login" className="secondary-button">Kembali ke login</Link>
      </div>
    </section>
  </main>;
}
