"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, CircleDollarSign, Copy, Ellipsis, LayoutDashboard, Link2, ListFilter, Pencil, Plus, Settings2, Share2, Sparkles, Trash2, TrendingDown, UserMinus, Users, WalletCards, X } from "lucide-react";
import { setOpeningBalance } from "@/app/actions/monthly-periods";
import { createShareLink, removeBookMember, revokeShareLink, updateMemberRole, updateShareLinkRole } from "@/app/actions/sharing";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast-provider";
import type { DashboardData, SelectOption, TransactionMutationInput, TransactionRow } from "./types";

const formatCurrency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const formatCompactCurrency = (value: number) => value >= 1_000_000 ? `Rp${(value / 1_000_000).toFixed(1)} jt` : `Rp${Math.round(value / 1_000)} rb`;

function StatCard({ label, value, helper, tone, icon, className = "" }: { label: string; value: string; helper: React.ReactNode; tone: "neutral" | "expense" | "balance"; icon: React.ReactNode; className?: string }) {
  const styles = { neutral: "bg-white text-slate-950", expense: "bg-[#fff7f3] text-slate-950", balance: "bg-[#123c32] text-white" };
  return <article className={`summary-card flex flex-col ${styles[tone]} ${className}`}>
    <div className="flex items-start justify-between"><div><p className={`text-sm font-medium ${tone === "balance" ? "text-emerald-100/75" : "text-slate-500"}`}>{label}</p><p className="mt-3 text-[clamp(1.55rem,3vw,2rem)] font-semibold tracking-[-0.04em]">{value}</p></div><span className={`grid size-10 place-items-center rounded-2xl ${tone === "balance" ? "bg-white/10 text-emerald-100" : "bg-slate-100 text-slate-600"}`}>{icon}</span></div>
    <div className={`mt-auto pt-5 text-xs ${tone === "balance" ? "text-emerald-100/65" : "text-slate-400"}`}>{helper}</div>
  </article>;
}

export function TransactionForm({ bookId, categories, paymentMethods, defaultDate, transaction, onClose, onSave }: { bookId: string; categories: SelectOption[]; paymentMethods: SelectOption[]; defaultDate: string; transaction?: TransactionRow; onClose: () => void; onSave: (values: TransactionMutationInput) => void }) {
  const [type, setType] = useState<"expense" | "income">(transaction?.type ?? "expense");
  const isEditing = Boolean(transaction);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      bookId,
      type,
      amount: Number(form.get("amount")),
      description: String(form.get("description") ?? ""),
      transactionDate: String(form.get("transactionDate") ?? ""),
      categoryId: String(form.get("categoryId") ?? ""),
      paymentMethodId: String(form.get("paymentMethodId") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });
  }

  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={isEditing ? "Edit transaksi" : "Tambah transaksi"}>
    <button className="absolute inset-0 cursor-default" aria-label="Tutup formulir" onClick={onClose} />
    <aside className="relative flex h-full w-full max-w-[460px] animate-slide-in flex-col bg-[#fbfcfa] shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{isEditing ? "Perbarui catatan" : "Transaksi baru"}</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{isEditing ? "Edit transaksi" : "Catat transaksi"}</h2></div><button onClick={onClose} className="icon-button" aria-label="Tutup"><X size={19} /></button></div>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setType("expense")} className={`type-button ${type === "expense" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}><ArrowUpRight size={16} /> Pengeluaran</button><button type="button" onClick={() => setType("income")} className={`type-button ${type === "income" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}><ArrowDownLeft size={16} /> Pemasukan</button></div>
          <label className="form-label">Nominal<div className="relative mt-2"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">Rp</span><input name="amount" className="form-input form-input-leading text-lg font-semibold" type="number" inputMode="numeric" min="1" step="1" placeholder="0" defaultValue={transaction?.amount} required /></div></label>
          <label className="form-label">Keterangan<input name="description" className="form-input mt-2" placeholder="Contoh: Makan siang" defaultValue={transaction?.description} required minLength={2} maxLength={160} /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="form-label">Tanggal<input name="transactionDate" className="form-input mt-2" type="date" defaultValue={transaction?.dateIso ?? defaultDate} required /></label><label className="form-label">Kategori<select name="categoryId" className="form-input mt-2" defaultValue={transaction?.categoryId} required>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
          <label className="form-label">Metode pembayaran<select name="paymentMethodId" className="form-input mt-2" defaultValue={transaction?.paymentMethodId} required>{paymentMethods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-label">Catatan <span className="font-normal text-slate-400">(opsional)</span><textarea name="notes" className="form-input mt-2 min-h-28 resize-none" maxLength={1000} placeholder="Tambahkan detail jika diperlukan" defaultValue={transaction?.notes ?? ""} /></label>
        </div>
        <div className="mt-auto flex gap-3 border-t border-slate-200 bg-white px-6 py-5"><button type="button" onClick={onClose} className="secondary-button flex-1">Batal</button><button type="submit" className="primary-button flex-1">{isEditing ? "Simpan perubahan" : "Simpan transaksi"}</button></div>
      </form>
    </aside>
  </div>;
}

export function DeleteConfirmation({ transaction, onClose, onConfirm }: { transaction: TransactionRow; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4 backdrop-blur-[2px]" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
    <button className="absolute inset-0 cursor-default" aria-label="Tutup konfirmasi" onClick={onClose} />
    <section className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
      <span className="grid size-11 place-items-center rounded-2xl bg-red-50 text-red-600"><Trash2 size={20} /></span>
      <h2 id="delete-title" className="mt-5 text-xl font-semibold tracking-tight text-slate-950">Hapus transaksi?</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Transaksi <strong className="font-semibold text-slate-700">{transaction.description}</strong> senilai {formatCurrency(transaction.amount)} akan dihapus permanen.</p>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="secondary-button">Batal</button><button type="button" onClick={onConfirm} className="inline-flex h-[2.6rem] items-center justify-center gap-2 rounded-[0.8rem] bg-red-600 px-4 text-[0.82rem] font-semibold text-white transition hover:bg-red-700"><Trash2 size={16} /> Hapus transaksi</button></div>
    </section>
  </div>;
}

function OpeningBalanceDialog({ bookId, month, monthLabel, openingBalance, onClose }: { bookId: string; month: string; monthLabel: string; openingBalance: number; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await toast.track(() => setOpeningBalance({ bookId, month, openingBalance: form.get("openingBalance") }), { loading: "Menyimpan dana awal...", success: "Dana awal berhasil diperbarui." });
        onClose();
        router.refresh();
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : "Dana awal gagal disimpan.");
      }
    });
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="balance-title">
    <button className="absolute inset-0 cursor-default" aria-label="Tutup pengaturan dana awal" onClick={onClose} disabled={isPending} />
    <section className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CircleDollarSign size={21} /></span><button type="button" onClick={onClose} disabled={isPending} className="icon-button" aria-label="Tutup"><X size={19} /></button></div>
      <h2 id="balance-title" className="mt-5 text-xl font-semibold tracking-tight text-slate-950">Atur dana awal</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Dana yang tersedia pada awal <span className="capitalize">{monthLabel}</span>. Nilai ini disimpan khusus untuk bulan tersebut.</p>
      <form onSubmit={handleSubmit} className="mt-5">
        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <label className="form-label">Dana awal bulan<div className="relative mt-2"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">Rp</span><input name="openingBalance" className="form-input form-input-leading text-lg font-semibold" type="number" inputMode="numeric" min="0" step="1" defaultValue={openingBalance} required autoFocus /></div></label>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} disabled={isPending} className="secondary-button">Batal</button><button type="submit" disabled={isPending} className="primary-button">{isPending ? "Menyimpan..." : "Simpan dana awal"}</button></div>
      </form>
    </section>
  </div>;
}

export function ShareDialog({ data, onClose }: { data: DashboardData; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [expiresInDays, setExpiresInDays] = useState<"1" | "7" | "30">("7");
  const [maxUses, setMaxUses] = useState<"1" | "5" | "10" | "unlimited">("1");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function createLink() {
    setError(null);
    setCreatedUrl(null);
    startTransition(async () => {
      try {
        const result = await toast.track(() => createShareLink({ bookId: data.book.id, role, expiresInDays: Number(expiresInDays), maxUses: maxUses === "unlimited" ? null : Number(maxUses) }), { loading: "Membuat link akses...", success: "Link akses berhasil dibuat." });
        setCreatedUrl(result.url);
        setCopied(false);
        router.refresh();
      } catch (shareError) {
        setError(shareError instanceof Error ? shareError.message : "Link gagal dibuat.");
      }
    });
  }

  async function copyLink() {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      toast.show("Link berhasil disalin.", "success");
    } catch {
      setError("Browser tidak mengizinkan penyalinan otomatis. Salin link secara manual.");
    }
  }

  function mutate(task: () => Promise<unknown>, messages = { loading: "Menyimpan perubahan akses...", success: "Perubahan akses berhasil disimpan." }) {
    setError(null);
    startTransition(async () => {
      try {
        await toast.track(task, messages);
        router.refresh();
      } catch (mutationError) {
        setError(mutationError instanceof Error ? mutationError.message : "Perubahan gagal disimpan.");
      }
    });
  }

  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Bagikan buku">
    <button className="absolute inset-0 cursor-default" aria-label="Tutup pengaturan berbagi" onClick={onClose} disabled={isPending} />
    <aside className="relative flex h-full w-full max-w-[520px] animate-slide-in flex-col bg-[#fbfcfa] shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Kolaborasi</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Bagikan {data.book.name}</h2></div><button onClick={onClose} disabled={isPending} className="icon-button" aria-label="Tutup"><X size={19} /></button></div>
      <div className="flex-1 space-y-7 overflow-y-auto p-6">
        {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <section>
          <div className="flex items-center gap-2"><Link2 size={17} className="text-emerald-700" /><h3 className="text-sm font-semibold text-slate-900">Buat link undangan</h3></div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Penerima membuka link secara langsung tanpa email. Akses otomatis berakhir sesuai durasi.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="form-label">Hak akses<select value={role} onChange={(event) => setRole(event.target.value as "viewer" | "editor")} className="form-input mt-2"><option value="viewer">Viewer</option><option value="editor">Editor</option></select></label><label className="form-label">Masa berlaku<select value={expiresInDays} onChange={(event) => setExpiresInDays(event.target.value as "1" | "7" | "30")} className="form-input mt-2"><option value="1">1 hari</option><option value="7">7 hari</option><option value="30">30 hari</option></select></label><label className="form-label">Batas buka<select value={maxUses} onChange={(event) => setMaxUses(event.target.value as "1" | "5" | "10" | "unlimited")} className="form-input mt-2"><option value="1">1 orang</option><option value="5">5 orang</option><option value="10">10 orang</option><option value="unlimited">Tak terbatas</option></select></label></div>
          <button type="button" onClick={createLink} disabled={isPending} className="primary-button mt-4 w-full"><Link2 size={16} /> {isPending ? "Memproses..." : "Buat link"}</button>
          {createdUrl && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="mb-2 text-xs font-semibold text-emerald-800">Link hanya ditampilkan sekarang. Simpan sebelum menutup dialog.</p><div className="flex gap-2"><input readOnly value={createdUrl} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none" /><button type="button" onClick={copyLink} className="secondary-button shrink-0">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Tersalin" : "Salin"}</button></div></div>}
        </section>

        <section className="border-t border-slate-200 pt-6">
          <div className="flex items-center gap-2"><Users size={17} className="text-emerald-700" /><h3 className="text-sm font-semibold text-slate-900">Anggota ({data.members.length})</h3></div>
          <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">{data.members.map((member) => <div key={member.userId} className="flex items-center gap-3 p-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{member.displayName.slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{member.displayName}</p><p className="mt-0.5 text-xs capitalize text-slate-400">{member.role}</p></div>{member.role === "owner" ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Owner</span> : <><select value={member.role} disabled={isPending} onChange={(event) => mutate(() => updateMemberRole({ bookId: data.book.id, userId: member.userId, role: event.target.value }))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none"><option value="viewer">Viewer</option><option value="editor">Editor</option></select><button type="button" disabled={isPending} onClick={() => { if (window.confirm(`Hapus akses ${member.displayName} dari buku ini?`)) mutate(() => removeBookMember({ bookId: data.book.id, userId: member.userId })); }} className="icon-button text-red-500" aria-label={`Hapus akses ${member.displayName}`}><UserMinus size={16} /></button></>}</div>)}</div>
          {data.members.some((member) => member.role !== "owner") && <div className="mt-3 space-y-1 rounded-xl bg-amber-50 p-3">{data.members.filter((member) => member.role !== "owner").map((member) => <p key={member.userId} className="text-xs text-amber-800"><strong>{member.displayName}</strong>: {member.expiresAt && new Date(member.expiresAt) > new Date() ? `aktif sampai ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(member.expiresAt))}` : "akses telah berakhir"}</p>)}</div>}
        </section>

        <section className="border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">Link aktif ({data.shareLinks.length})</h3>
          <p className="mt-1 text-xs text-slate-400">Jumlah pemakaian dan batas pembukaan ditampilkan untuk setiap link.</p>
          <div className="mt-3 space-y-2">{data.shareLinks.length ? data.shareLinks.map((link) => <div key={link.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><Link2 size={16} /></span><div className="min-w-0 flex-1"><p className="text-xs text-slate-400">{link.expiresAt ? `Berakhir ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(link.expiresAt))}` : "Tanpa kedaluwarsa"} · Dipakai {link.usageCount}×</p></div><select value={link.role} disabled={isPending} onChange={(event) => mutate(() => updateShareLinkRole(link.id, data.book.id, event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold capitalize text-slate-700 outline-none" aria-label="Ubah akses link"><option value="viewer">Viewer</option><option value="editor">Editor</option></select><button type="button" disabled={isPending} onClick={() => mutate(() => revokeShareLink(link.id, data.book.id))} className="text-xs font-semibold text-red-600 hover:text-red-800">Cabut</button></div>) : <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">Belum ada link aktif.</p>}</div>
        </section>
      </div>
    </aside>
  </div>;
}

export function TransactionMenu({ transaction, onEdit, onDelete, placement = "down" }: { transaction: TransactionRow; onEdit: () => void; onDelete: () => void; placement?: "up" | "down" }) {
  const [isOpen, setIsOpen] = useState(false);
  return <div className="relative">
    <button className="icon-button" aria-label={`Menu ${transaction.description}`} aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)}><Ellipsis size={18} /></button>
    {isOpen && <div className={`absolute right-0 z-30 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ${placement === "up" ? "bottom-11" : "top-11"}`}><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" onClick={() => { setIsOpen(false); onEdit(); }}><Pencil size={15} /> Edit</button><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => { setIsOpen(false); onDelete(); }}><Trash2 size={15} /> Hapus</button></div>}
  </div>;
}

export function Dashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [isOpeningBalanceOpen, setIsOpeningBalanceOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => data.transactions.find((item) => item.type === "expense")?.dateIso ?? data.month);
  const expenses = data.transactions.filter((item) => item.type === "expense");
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = data.transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const balance = data.openingBalance + totalIncome - totalExpenses;
  const percentageLeft = data.openingBalance + totalIncome > 0 ? Math.max(0, balance / (data.openingBalance + totalIncome) * 100) : 0;
  const initials = data.profileName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const monthInputValue = data.month.slice(0, 7);
  const activeDate = selectedDate.startsWith(monthInputValue) ? selectedDate : (expenses[0]?.dateIso ?? data.month);
  const selectedTransactions = data.transactions.filter((item) => item.dateIso === activeDate);
  const selectedExpenses = expenses.filter((item) => item.dateIso === activeDate);
  const selectedDayTotal = selectedExpenses.reduce((sum, item) => sum + item.amount, 0);
  const categoryData = Array.from(selectedExpenses.reduce((map, item) => {
    const current = map.get(item.category);
    map.set(item.category, { value: (current?.value ?? 0) + item.amount, color: item.categoryColor });
    return map;
  }, new Map<string, { value: number; color: string }>())).map(([name, item]) => ({ name, ...item })).sort((a, b) => b.value - a.value);
  const monthlyExpenseByCategory = expenses.reduce((map, item) => map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + item.amount), new Map<string, number>());
  const activeCategoryIds = new Set(data.categories.map((item) => item.id));
  const monthlyCategoryData = [
    ...data.categories.map((item) => ({ name: item.name, value: monthlyExpenseByCategory.get(item.id) ?? 0, color: item.color ?? "#64748b" })),
    ...Array.from(expenses.reduce((map, item) => {
      if (!activeCategoryIds.has(item.categoryId) && !map.has(item.categoryId)) map.set(item.categoryId, { name: item.category, value: monthlyExpenseByCategory.get(item.categoryId) ?? 0, color: item.categoryColor });
      return map;
    }, new Map<string, { name: string; value: number; color: string }>()).values()),
  ].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "id"));
  const topCategory = categoryData[0];
  const recentTransactions = data.transactions.slice(0, 5);
  const lastDateOfMonth = new Date(Date.UTC(Number(monthInputValue.slice(0, 4)), Number(monthInputValue.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const canEdit = data.role === "owner" || data.role === "editor";
  const isOwner = data.role === "owner";

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`book:${data.book.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `book_id=eq.${data.book.id}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "monthly_periods", filter: `book_id=eq.${data.book.id}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "book_members", filter: `book_id=eq.${data.book.id}` }, () => router.refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [data.book.id, router]);

  useEffect(() => {
    if (!data.accessExpiresAt) return;
    const remaining = new Date(data.accessExpiresAt).getTime() - Date.now();
    if (remaining <= 0) { router.refresh(); return; }
    const timer = window.setTimeout(() => window.location.reload(), Math.min(remaining + 1000, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [data.accessExpiresAt, router]);

  function changeMonth(value: string) { if (value) router.push(`/?book=${data.book.id}&month=${value}`); }
  function changeBook(value: string) { if (value) router.push(`/?book=${value}&month=${monthInputValue}`); }
  function shiftDate(days: number) {
    const date = new Date(`${activeDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    const nextDate = date.toISOString().slice(0, 10);
    if (nextDate >= data.month && nextDate <= lastDateOfMonth) setSelectedDate(nextDate);
  }

  return <main className="min-h-screen bg-[#f3f5f1] text-slate-950">
    <header className="border-b border-slate-200/80 bg-[#f8faf7]/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-7 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#123c32] text-white"><WalletCards size={21} /></div>
          <div className="min-w-0 flex-1">
            <select value={data.book.id} onChange={(event) => changeBook(event.target.value)} className="block w-full max-w-[10rem] truncate bg-transparent text-[15px] font-semibold outline-none sm:max-w-[15rem]" aria-label="Pilih buku keuangan">{data.books.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}</select>
            <p className="truncate text-xs capitalize text-slate-400">{data.role} · Money Manager</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isOwner && <button onClick={() => setIsShareOpen(true)} className="secondary-button px-3 sm:px-4"><Share2 size={16} /><span className="hidden xl:inline">Bagikan</span></button>}
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d9eadf] text-sm font-bold text-emerald-900">{initials}</span>
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 sm:px-7 lg:px-10" aria-label="Navigasi utama"><Link href={`/?book=${data.book.id}&month=${monthInputValue}`} className="inline-flex shrink-0 items-center gap-2 border-b-2 border-emerald-700 px-3 py-3 text-sm font-semibold text-emerald-800"><LayoutDashboard size={16} /> Dashboard</Link><Link href={`/transactions?book=${data.book.id}&month=${monthInputValue}`} className="inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900"><ListFilter size={16} /> Transaksi</Link><Link href={`/settings?book=${data.book.id}&month=${monthInputValue}`} className="inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900"><Settings2 size={16} /> Pengaturan</Link></nav>
    </header>
    <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
      <label className="month-button mb-5 flex w-full sm:w-auto"><CalendarDays size={16} /><span className="sr-only">Pilih bulan</span><input type="month" min="2000-01" max="2099-12" value={monthInputValue} onChange={(event) => changeMonth(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none sm:w-[9rem] sm:flex-none" aria-label="Pilih bulan dashboard" /></label>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700"><Sparkles size={15} /> Ringkasan bulan ini</div><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Selamat datang, {data.profileName}</h1><p className="mt-2 text-sm text-slate-500">{canEdit ? "Lihat posisi dana dan pola pengeluaran harianmu." : "Anda memiliki akses lihat saja pada buku ini."}</p></div>{canEdit && <Link href={`/transactions?book=${data.book.id}&month=${monthInputValue}`} className="primary-button w-full sm:w-auto"><Plus size={18} /> Catat transaksi</Link>}</section>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:grid-rows-2"><StatCard label="Sisa dana" value={formatCurrency(balance)} helper={<div><p className="text-sm text-emerald-50/80">{percentageLeft.toFixed(1)}% dari seluruh dana tersedia</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.min(100, percentageLeft)}%` }} /></div></div>} tone="balance" icon={<WalletCards size={20} />} className="sm:col-span-2 xl:col-span-2 xl:row-span-2 xl:min-h-[352px]" /><StatCard label="Dana awal bulan" value={formatCurrency(data.openingBalance)} helper={<span className="flex items-center justify-between gap-3"><span className="capitalize">{data.monthLabel}</span>{canEdit && <button type="button" onClick={() => setIsOpeningBalanceOpen(true)} className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900"><Pencil size={12} /> Ubah</button>}</span>} tone="neutral" icon={<CircleDollarSign size={20} />} /><StatCard label="Total pemasukan" value={formatCurrency(totalIncome)} helper={`${data.transactions.filter((item) => item.type === "income").length} transaksi masuk`} tone="neutral" icon={<ArrowDownLeft size={20} />} /><StatCard label="Total pengeluaran" value={formatCurrency(totalExpenses)} helper={`${expenses.length} transaksi pengeluaran`} tone="expense" icon={<TrendingDown size={20} />} className="sm:col-span-2 xl:col-span-2" /></section>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Warna kategori">{data.categories.map((category) => <span key={category.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm"><span className="size-2.5 rounded-full" style={{ backgroundColor: category.color ?? "#64748b" }} />{category.name}</span>)}</div>
      <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.85fr] xl:[&>.panel>div:last-child]:h-[530px] xl:[&>article]:h-[620px]">
        <article className="panel min-h-[520px] xl:h-[520px]"><div className="panel-header"><div><h2 className="panel-title">Pengeluaran per kategori</h2><p className="panel-subtitle">Seluruh kategori pada bulan terpilih, termasuk yang belum memiliki pengeluaran</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold capitalize text-emerald-700">{data.monthLabel}</span></div><div className="h-[430px] w-full pt-6">{monthlyCategoryData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyCategoryData} layout="vertical" margin={{ left: 8, right: 12, top: 8, bottom: 8 }}><CartesianGrid horizontal={false} stroke="#edf0ec" /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={formatCompactCurrency} /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={92} tick={{ fill: "#64748b", fontSize: 12 }} /><Tooltip formatter={(value) => [formatCurrency(Number(value)), "Pengeluaran"]} /><Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={22}>{monthlyCategoryData.map((item) => <Cell key={item.name} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyChart message="Tambahkan kategori untuk menampilkan grafik." />}</div></article>

        <article className="flex overflow-hidden rounded-[1.25rem] border border-slate-200/75 bg-white shadow-sm xl:h-[520px]"><div className="flex min-h-0 w-full flex-col"><div className="shrink-0 bg-[#fff8f3] p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700">Rincian hari</p><h2 className="mt-1 text-lg font-semibold">{new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${activeDate}T00:00:00Z`))}</h2></div><div className="flex gap-1"><button type="button" onClick={() => shiftDate(-1)} disabled={activeDate <= data.month} className="icon-button bg-white disabled:cursor-not-allowed disabled:opacity-30" aria-label="Hari sebelumnya"><ChevronLeft size={17} /></button><button type="button" onClick={() => shiftDate(1)} disabled={activeDate >= lastDateOfMonth} className="icon-button bg-white disabled:cursor-not-allowed disabled:opacity-30" aria-label="Hari berikutnya"><ChevronRight size={17} /></button></div></div><label className="mt-4 block"><span className="sr-only">Pilih tanggal rincian</span><input type="date" min={data.month} max={lastDateOfMonth} value={activeDate} onChange={(event) => setSelectedDate(event.target.value)} className="form-input bg-white" /></label><div className="mt-5 grid grid-cols-3 gap-3"><div><p className="text-xs text-slate-400">Pengeluaran</p><p className="mt-1 text-base font-semibold">{formatCurrency(selectedDayTotal)}</p></div><div><p className="text-xs text-slate-400">Transaksi</p><p className="mt-1 text-base font-semibold">{selectedTransactions.length}</p></div><div><p className="text-xs text-slate-400">Terbesar</p><p className="mt-1 truncate text-base font-semibold">{topCategory?.name ?? "—"}</p></div></div></div><div className="flex min-h-0 flex-1 flex-col gap-5 p-5 sm:p-6"><div className="shrink-0"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Kategori pengeluaran</h3><span className="text-xs text-slate-400">{categoryData.length} kategori</span></div><div className="mt-3 space-y-3">{categoryData.slice(0, 4).map((category) => <div key={category.name}><div className="flex justify-between gap-3 text-xs"><span className="font-medium text-slate-600">{category.name}</span><span className="font-semibold text-slate-800">{formatCurrency(category.value)}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2f7d68]" style={{ width: `${selectedDayTotal ? category.value / selectedDayTotal * 100 : 0}%` }} /></div></div>)}{!categoryData.length && <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">Tidak ada pengeluaran pada hari ini.</p>}</div></div><div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 pt-5"><div className="flex shrink-0 items-center justify-between"><h3 className="text-sm font-semibold">Transaksi hari ini</h3><Link href={`/transactions?book=${data.book.id}&month=${monthInputValue}`} className="text-xs font-semibold text-emerald-700">Lihat semua</Link></div><div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">{selectedTransactions.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>{item.type === "income" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{item.description}</p><p className="mt-0.5 truncate text-[11px] text-slate-400">{item.category}{item.notes ? ` · ${item.notes}` : ""}</p></div><p className={`whitespace-nowrap text-xs font-semibold ${item.type === "income" ? "text-emerald-700" : "text-slate-700"}`}>{item.type === "income" ? "+" : "−"}{formatCurrency(item.amount)}</p></div>)}{!selectedTransactions.length && <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">Belum ada transaksi pada hari ini.</p>}</div></div></div></div></article>
      </section>
      <section className="panel mt-4 overflow-hidden p-0"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div><h2 className="panel-title">Transaksi terbaru</h2><p className="panel-subtitle">Lima catatan terakhir pada <span className="capitalize">{data.monthLabel}</span></p></div><Link href={`/transactions?book=${data.book.id}&month=${monthInputValue}`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Lihat semua</Link></div><div className="divide-y divide-slate-100">{recentTransactions.map((item) => <article key={item.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>{item.type === "income" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.description}</p><p className="mt-1 truncate text-xs text-slate-400">{item.category} · {item.method} · {item.date}{item.notes ? ` · ${item.notes}` : ""}</p></div><p className={`whitespace-nowrap text-sm font-semibold ${item.type === "income" ? "text-emerald-700" : "text-slate-800"}`}>{item.type === "income" ? "+" : "−"}{formatCurrency(item.amount)}</p></article>)}{!recentTransactions.length && <p className="p-8 text-center text-sm text-slate-400">Belum ada transaksi bulan ini.</p>}</div></section>
    </div>
    {canEdit && isOpeningBalanceOpen && <OpeningBalanceDialog bookId={data.book.id} month={data.month} monthLabel={data.monthLabel} openingBalance={data.openingBalance} onClose={() => setIsOpeningBalanceOpen(false)} />}
    {isOwner && isShareOpen && <ShareDialog data={data} onClose={() => setIsShareOpen(false)} />}
  </main>;
}

function EmptyChart({ message = "Grafik akan muncul setelah ada pengeluaran." }: { message?: string }) {
  return <div className="grid h-full place-items-center rounded-xl bg-slate-50 text-sm text-slate-400">{message}</div>;
}
