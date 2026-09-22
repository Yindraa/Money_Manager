import { WalletCards } from "lucide-react";

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/75 ${className}`} />;
}

export default function Loading() {
  return <main className="min-h-screen bg-[#f3f5f1] text-slate-950" aria-busy="true" aria-label="Memuat data keuangan">
    <header className="border-b border-slate-200/80 bg-[#f8faf7]/95">
      <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between px-4 sm:px-7 lg:px-10">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#123c32] text-white"><WalletCards size={21} /></span><div className="space-y-2"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-2.5 w-24" /></div></div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="mx-auto flex max-w-[1440px] gap-7 px-4 pb-3 sm:px-7 lg:px-10"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /></div>
    </header>

    <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
      <div className="space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-9 w-64 max-w-full" /><Skeleton className="h-3.5 w-80 max-w-full" /></div>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-44 sm:col-span-2" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <Skeleton className="h-[430px]" />
        <Skeleton className="h-[430px]" />
      </section>
    </div>
    <p className="sr-only" role="status">Sedang memuat data keuangan Anda.</p>
  </main>;
}
