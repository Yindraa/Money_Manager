"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Ellipsis,
  Menu,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type Transaction = {
  id: number;
  date: string;
  description: string;
  category: string;
  method: string;
  amount: number;
  type: "expense" | "income";
};

const transactions: Transaction[] = [
  { id: 1, date: "21 Sep 2026", description: "Laundry baju", category: "Kebutuhan sehari-hari", method: "QRIS", amount: 47688, type: "expense" },
  { id: 2, date: "20 Sep 2026", description: "Makan malam (GoFood)", category: "Makanan/Minuman", method: "QRIS", amount: 29500, type: "expense" },
  { id: 3, date: "20 Sep 2026", description: "Token listrik", category: "Listrik", method: "QRIS", amount: 101750, type: "expense" },
  { id: 4, date: "20 Sep 2026", description: "Akun Premium GPT", category: "Software/Subscription", method: "QRIS", amount: 85000, type: "expense" },
  { id: 5, date: "20 Sep 2026", description: "Kakak transfer", category: "Lain-lain", method: "Transfer", amount: 150000, type: "income" },
  { id: 6, date: "20 Sep 2026", description: "Bayar kost", category: "Kost", method: "Transfer", amount: 3692500, type: "expense" },
];

const categoryData = [
  { name: "Kost", value: 4195000 },
  { name: "Kebutuhan harian", value: 469188 },
  { name: "Belanja", value: 456456 },
  { name: "Lain-lain", value: 293400 },
  { name: "Makanan", value: 281100 },
];

const dailyData = [
  { day: "19 Sep", value: 482100 },
  { day: "20 Sep", value: 5506606 },
  { day: "21 Sep", value: 47688 },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)} jt`;
  return `Rp${Math.round(value / 1_000)} rb`;
};

function StatCard({ label, value, helper, tone, icon }: {
  label: string;
  value: string;
  helper: string;
  tone: "neutral" | "expense" | "balance";
  icon: React.ReactNode;
}) {
  const styles = {
    neutral: "bg-white text-slate-950",
    expense: "bg-[#fff7f3] text-slate-950",
    balance: "bg-[#123c32] text-white",
  };

  return (
    <article className={`summary-card ${styles[tone]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${tone === "balance" ? "text-emerald-100/75" : "text-slate-500"}`}>{label}</p>
          <p className="mt-3 text-[clamp(1.55rem,3vw,2rem)] font-semibold tracking-[-0.04em]">{value}</p>
        </div>
        <span className={`grid size-10 place-items-center rounded-2xl ${tone === "balance" ? "bg-white/10 text-emerald-100" : "bg-slate-100 text-slate-600"}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-5 text-xs ${tone === "balance" ? "text-emerald-100/65" : "text-slate-400"}`}>{helper}</p>
    </article>
  );
}

function TransactionForm({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<"expense" | "income">("expense");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Tambah transaksi">
      <button className="absolute inset-0 cursor-default" aria-label="Tutup formulir" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[460px] animate-slide-in flex-col bg-[#fbfcfa] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Transaksi baru</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Catat transaksi</h2>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Tutup"><X size={19} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-5 p-6">
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => setType("expense")} className={`type-button ${type === "expense" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>
                <ArrowUpRight size={16} /> Pengeluaran
              </button>
              <button type="button" onClick={() => setType("income")} className={`type-button ${type === "income" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>
                <ArrowDownLeft size={16} /> Pemasukan
              </button>
            </div>

            <label className="form-label">
              Nominal
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">Rp</span>
                <input className="form-input pl-11 text-lg font-semibold" inputMode="numeric" placeholder="0" required />
              </div>
            </label>

            <label className="form-label">Keterangan<input className="form-input mt-2" placeholder="Contoh: Makan siang" required /></label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-label">Tanggal<input className="form-input mt-2" type="date" defaultValue="2026-09-21" required /></label>
              <label className="form-label">Kategori
                <select className="form-input mt-2" defaultValue="Makanan/Minuman">
                  <option>Makanan/Minuman</option><option>Transportasi</option><option>Kost</option><option>Kebutuhan sehari-hari</option><option>Lain-lain</option>
                </select>
              </label>
            </div>

            <label className="form-label">Metode pembayaran
              <select className="form-input mt-2" defaultValue="QRIS"><option>QRIS</option><option>Transfer</option><option>Tunai</option></select>
            </label>

            <label className="form-label">Catatan <span className="font-normal text-slate-400">(opsional)</span>
              <textarea className="form-input mt-2 min-h-28 resize-none" placeholder="Tambahkan detail jika diperlukan" />
            </label>
          </div>

          <div className="mt-auto flex gap-3 border-t border-slate-200 bg-white px-6 py-5">
            <button type="button" onClick={onClose} className="secondary-button flex-1">Batal</button>
            <button type="submit" className="primary-button flex-1">Simpan transaksi</button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default function Home() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filteredTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.description.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  return (
    <main className="min-h-screen bg-[#f3f5f1] text-slate-950">
      <header className="border-b border-slate-200/80 bg-[#f8faf7]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-4 sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <button className="icon-button lg:hidden" aria-label="Buka menu"><Menu size={20} /></button>
            <div className="grid size-10 place-items-center rounded-2xl bg-[#123c32] text-white shadow-sm"><WalletCards size={21} strokeWidth={2.2} /></div>
            <div><p className="text-[15px] font-semibold tracking-tight">Dompetku</p><p className="text-xs text-slate-400">Money Manager</p></div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button className="month-button"><CalendarDays size={16} /><span className="hidden sm:inline">September 2026</span><span className="sm:hidden">Sep 2026</span><ChevronDown size={15} /></button>
            <button className="secondary-button hidden sm:flex"><Share2 size={16} /> Bagikan</button>
            <button className="grid size-10 place-items-center rounded-full bg-[#d9eadf] text-sm font-bold text-emerald-900">YI</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700"><Sparkles size={15} /> Ringkasan bulan ini</div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Selamat datang, Yindra</h1>
            <p className="mt-2 text-sm text-slate-500">Pantau arus pengeluaranmu tanpa kehilangan detail.</p>
          </div>
          <button onClick={() => setIsFormOpen(true)} className="primary-button w-full sm:w-auto"><Plus size={18} /> Tambah transaksi</button>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <StatCard label="Dana awal bulan" value="Rp7.156.911" helper="Ditetapkan pada 1 September" tone="neutral" icon={<CircleDollarSign size={20} />} />
          <StatCard label="Total pengeluaran" value="Rp6.036.394" helper="23 transaksi bulan ini" tone="expense" icon={<TrendingDown size={20} />} />
          <StatCard label="Sisa dana" value="Rp1.270.517" helper="17,7% dari dana tersedia" tone="balance" icon={<WalletCards size={20} />} />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
          <article className="panel">
            <div className="panel-header">
              <div><h2 className="panel-title">Pengeluaran terbesar</h2><p className="panel-subtitle">Berdasarkan kategori bulan ini</p></div>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">Kost 69%</span>
            </div>
            <div className="h-[270px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 4, right: 12 }}>
                  <CartesianGrid horizontal={false} stroke="#edf0ec" /><XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={116} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} cursor={{ fill: "#f5f7f4" }} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 10px 30px rgba(15,23,42,.08)" }} />
                  <Bar dataKey="value" fill="#2f7d68" radius={[0, 8, 8, 0]} barSize={19} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div><h2 className="panel-title">Tren pengeluaran</h2><p className="panel-subtitle">Aktivitas pengeluaran per hari</p></div>
              <div className="text-right"><p className="text-xs text-slate-400">Tertinggi</p><p className="text-sm font-semibold">20 September</p></div>
            </div>
            <div className="h-[270px] w-full pt-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ left: 0, right: 8, top: 8 }}>
                  <defs><linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef8f63" stopOpacity={0.34} /><stop offset="100%" stopColor="#ef8f63" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="#edf0ec" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} width={55} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={formatCompactCurrency} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 10px 30px rgba(15,23,42,.08)" }} />
                  <Area type="monotone" dataKey="value" stroke="#dc7043" strokeWidth={2.5} fill="url(#expenseGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="panel mt-4 overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="panel-title">Transaksi terbaru</h2><p className="panel-subtitle">Semua catatan pada September 2026</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 sm:w-64"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10" placeholder="Cari transaksi..." /></label>
              <button className="secondary-button"><SlidersHorizontal size={16} /> Filter</button>
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[800px] text-left">
              <thead><tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400"><th className="px-6 py-4">Tanggal</th><th className="px-6 py-4">Keterangan</th><th className="px-6 py-4">Kategori</th><th className="px-6 py-4">Metode</th><th className="px-6 py-4 text-right">Nominal</th><th className="w-14 px-4 py-4" /></tr></thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{transaction.date}</td><td className="px-6 py-4 text-sm font-semibold text-slate-800">{transaction.description}</td><td className="px-6 py-4"><span className="category-pill">{transaction.category}</span></td><td className="px-6 py-4 text-sm text-slate-500">{transaction.method}</td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-semibold ${transaction.type === "income" ? "text-emerald-700" : "text-slate-800"}`}>{transaction.type === "income" ? "+" : "−"}{formatCurrency(transaction.amount)}</td>
                    <td className="px-4 py-4"><button className="icon-button opacity-60 group-hover:opacity-100" aria-label={`Menu ${transaction.description}`}><Ellipsis size={18} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {filteredTransactions.map((transaction) => (
              <article key={transaction.id} className="flex items-center gap-3 px-5 py-4">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${transaction.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>{transaction.type === "income" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{transaction.description}</p><p className="mt-1 truncate text-xs text-slate-400">{transaction.category} · {transaction.date}</p></div>
                <p className={`text-sm font-semibold ${transaction.type === "income" ? "text-emerald-700" : "text-slate-800"}`}>{transaction.type === "income" ? "+" : "−"}{formatCompactCurrency(transaction.amount)}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <button onClick={() => setIsFormOpen(true)} className="fixed bottom-5 right-5 grid size-14 place-items-center rounded-full bg-[#123c32] text-white shadow-xl shadow-emerald-950/20 sm:hidden" aria-label="Tambah transaksi"><Plus size={24} /></button>
      {isFormOpen && <TransactionForm onClose={() => setIsFormOpen(false)} />}
    </main>
  );
}
