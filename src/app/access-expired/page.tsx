import { Clock3, LogOut, WalletCards } from "lucide-react";
import { signOut } from "@/app/actions/settings";

export default function AccessExpiredPage() {
  return <main className="grid min-h-screen place-items-center bg-[#f3f5f1] px-4 py-10">
    <section className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Clock3 size={23} /></span>
      <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-800"><WalletCards size={17} /> Dompetku</div>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Akses telah berakhir</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">Masa berlaku akses sementara Anda telah habis atau dicabut. Minta owner membuat dan membagikan link baru.</p>
      <form action={signOut}><button type="submit" className="secondary-button mt-7 w-full"><LogOut size={17} /> Tutup sesi tamu</button></form>
    </section>
  </main>;
}
