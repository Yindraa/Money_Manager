"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, LayoutDashboard, ListFilter, Plus, Search, Settings, WalletCards } from "lucide-react";
import { createTransaction, deleteTransaction, updateTransaction } from "@/app/actions/transactions";
import { createClient } from "@/lib/supabase/client";
import { DeleteConfirmation, TransactionForm, TransactionMenu } from "@/components/dashboard/dashboard";
import { useToast } from "@/components/ui/toast-provider";
import type { DashboardData, TransactionMutationInput, TransactionRow } from "@/components/dashboard/types";

const formatCurrency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

function CategoryBadge({ name, color }: { name: string; color: string }) {
  return <span className="category-pill border" style={{ backgroundColor: `${color}18`, borderColor: `${color}40`, color }}>{name}</span>;
}

function sortTransactions(items: TransactionRow[]) {
  return [...items].sort((first, second) => second.dateIso.localeCompare(first.dateIso));
}

function formatTransactionDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function TransactionsPage({ data }: { data: DashboardData }) {
  const router = useRouter();
  const toast = useToast();
  const [transactions, setTransactions] = useState(data.transactions);
  const [serverTransactions, setServerTransactions] = useState(data.transactions);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionRow | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<TransactionRow | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const monthValue = data.month.slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);
  const defaultDate = today.startsWith(monthValue) ? today : data.month;
  const canEdit = data.role === "owner" || data.role === "editor";

  const filteredTransactions = useMemo(() => transactions.filter((item) => {
    const matchesSearch = `${item.description} ${item.category} ${item.method} ${item.notes ?? ""} ${item.createdByName}`.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || item.categoryId === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  }), [categoryFilter, search, transactions, typeFilter]);

  const filteredExpenses = filteredTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const filteredIncome = filteredTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);

  if (serverTransactions !== data.transactions) {
    setServerTransactions(data.transactions);
    setTransactions(data.transactions);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`transactions-page:${data.book.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `book_id=eq.${data.book.id}` }, () => router.refresh())
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

  function changeBook(bookId: string) { if (bookId) router.push(`/transactions?book=${bookId}&month=${monthValue}`); }
  function changeMonth(month: string) { if (month) router.push(`/transactions?book=${data.book.id}&month=${month}`); }
  function openNew() { setEditingTransaction(null); setIsFormOpen(true); }
  function openEdit(transaction: TransactionRow) { setEditingTransaction(transaction); setIsFormOpen(true); }
  function closeForm() { setEditingTransaction(null); setIsFormOpen(false); }

  function saveTransaction(values: TransactionMutationInput) {
    const original = editingTransaction;
    const optimisticId = original?.id ?? `optimistic-${crypto.randomUUID()}`;
    const category = data.categories.find((item) => item.id === values.categoryId);
    const paymentMethod = data.paymentMethods.find((item) => item.id === values.paymentMethodId);
    const optimisticTransaction: TransactionRow = {
      id: optimisticId,
      dateIso: values.transactionDate,
      date: formatTransactionDate(values.transactionDate),
      description: values.description.trim(),
      categoryId: values.categoryId,
      category: category?.name ?? "Tanpa kategori",
      categoryColor: category?.color ?? "#64748b",
      paymentMethodId: values.paymentMethodId,
      method: paymentMethod?.name ?? "—",
      amount: values.amount,
      type: values.type,
      notes: values.notes.trim() || null,
      createdByName: original?.createdByName ?? data.profileName,
    };

    setTransactions((current) => sortTransactions(original
      ? current.map((item) => item.id === original.id ? optimisticTransaction : item)
      : [optimisticTransaction, ...current]));
    closeForm();

    const task = original
      ? updateTransaction(original.id, values)
      : createTransaction(values);
    void toast.track(
      () => task,
      {
        loading: original ? "Menyimpan perubahan transaksi..." : "Menambahkan transaksi...",
        success: original ? "Transaksi berhasil diperbarui." : "Transaksi berhasil ditambahkan.",
      },
    ).then((result) => {
      if (!original) {
        setTransactions((current) => current.map((item) => item.id === optimisticId ? { ...item, id: result.id } : item));
      }
    }).catch(() => {
      setTransactions((current) => original
        ? sortTransactions(current.map((item) => item.id === original.id ? original : item))
        : current.filter((item) => item.id !== optimisticId));
    });
  }

  function removeTransaction(transaction: TransactionRow) {
    setTransactions((current) => current.filter((item) => item.id !== transaction.id));
    setDeletingTransaction(null);
    void toast.track(
      () => deleteTransaction(transaction.id),
      { loading: "Menghapus transaksi...", success: "Transaksi berhasil dihapus." },
    ).catch(() => {
      setTransactions((current) => current.some((item) => item.id === transaction.id)
        ? current
        : sortTransactions([transaction, ...current]));
    });
  }

  return <main className="min-h-screen bg-[#f3f5f1] text-slate-950">
    <header className="border-b border-slate-200/80 bg-[#f8faf7]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-7 lg:px-10">
        <div className="flex min-w-0 items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#123c32] text-white"><WalletCards size={21} /></div><div className="min-w-0"><select value={data.book.id} onChange={(event) => changeBook(event.target.value)} className="max-w-[10rem] bg-transparent text-[15px] font-semibold outline-none sm:max-w-[15rem]" aria-label="Pilih buku keuangan">{data.books.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}</select><p className="text-xs capitalize text-slate-400">{data.role} · Money Manager</p></div></div>
        <label className="month-button"><CalendarDays size={16} /><input type="month" min="2000-01" max="2099-12" value={monthValue} onChange={(event) => changeMonth(event.target.value)} className="w-[8.2rem] bg-transparent text-sm font-semibold outline-none sm:w-[9rem]" aria-label="Pilih bulan transaksi" /></label>
      </div>
      <nav className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 sm:px-7 lg:px-10" aria-label="Navigasi utama"><Link href={`/?book=${data.book.id}&month=${monthValue}`} className="inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900"><LayoutDashboard size={16} /> Dashboard</Link><Link href={`/transactions?book=${data.book.id}&month=${monthValue}`} className="inline-flex shrink-0 items-center gap-2 border-b-2 border-emerald-700 px-3 py-3 text-sm font-semibold text-emerald-800"><ListFilter size={16} /> Transaksi</Link><Link href={`/settings?book=${data.book.id}&month=${monthValue}`} className="inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900"><Settings size={16} /> Pengaturan</Link></nav>
    </header>

    <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold capitalize text-emerald-700">{data.monthLabel}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Catatan transaksi</h1><p className="mt-2 text-sm text-slate-500">Semua pemasukan dan pengeluaran, selengkap lembar pencatatan Anda.</p></div>{canEdit && <button onClick={openNew} className="primary-button w-full sm:w-auto"><Plus size={18} /> Tambah transaksi</button>}</section>

      <section className="mt-7 grid gap-3 sm:grid-cols-3"><div className="panel py-4"><p className="text-xs font-medium text-slate-400">Hasil ditampilkan</p><p className="mt-2 text-xl font-semibold">{filteredTransactions.length} transaksi</p></div><div className="panel py-4"><p className="text-xs font-medium text-slate-400">Total pemasukan</p><p className="mt-2 text-xl font-semibold text-emerald-700">{formatCurrency(filteredIncome)}</p></div><div className="panel py-4"><p className="text-xs font-medium text-slate-400">Total pengeluaran</p><p className="mt-2 text-xl font-semibold text-orange-700">{formatCurrency(filteredExpenses)}</p></div></section>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Warna kategori">{data.categories.map((category) => <button key={category.id} type="button" onClick={() => setCategoryFilter(category.id)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm"><span className="size-2.5 rounded-full" style={{ backgroundColor: category.color ?? "#64748b" }} />{category.name}</button>)}</div>

      <section className="panel mt-4 overflow-visible p-0">
        <div className="grid gap-3 border-b border-slate-100 px-5 py-5 md:grid-cols-[minmax(220px,1fr)_180px_220px] sm:px-6"><label className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-emerald-600" placeholder="Cari keterangan, catatan, pencatat..." /></label><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "all" | "expense" | "income")} className="form-input filter-select"><option value="all">Semua jenis</option><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="form-input filter-select"><option value="all">Semua kategori</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>

        <div className={`hidden overflow-x-auto lg:block ${filteredTransactions.length <= 1 ? "min-h-56" : ""}`}>
          <table className="w-full min-w-[1180px] text-left">
            <thead><tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-[0.07em] text-slate-400"><th className="px-5 py-4">Tanggal</th><th className="px-5 py-4">Jenis</th><th className="px-5 py-4">Keterangan</th><th className="px-5 py-4">Kategori</th><th className="px-5 py-4">Metode</th><th className="px-5 py-4">Catatan</th><th className="px-5 py-4">Dibuat oleh</th><th className="px-5 py-4 text-right">Nominal</th><th className="w-14 px-3 py-4" /></tr></thead>
            <tbody>
              {filteredTransactions.map((item, index) => <tr key={item.id} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{item.date}</td>
                <td className="px-5 py-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${item.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>{item.type === "income" ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}{item.type === "income" ? "Pemasukan" : "Pengeluaran"}</span></td>
                <td className="max-w-52 px-5 py-4 text-sm font-semibold text-slate-800">{item.description}</td>
                <td className="px-5 py-4"><CategoryBadge name={item.category} color={item.categoryColor} /></td>
                <td className="px-5 py-4 text-sm text-slate-500">{item.method}</td>
                <td className="max-w-64 px-5 py-4 text-sm leading-5 text-slate-500">{item.notes || <span className="text-slate-300">Tidak ada catatan</span>}</td>
                <td className="px-5 py-4 text-sm text-slate-500">{item.createdByName}</td>
                <td className={`whitespace-nowrap px-5 py-4 text-right text-sm font-semibold ${item.type === "income" ? "text-emerald-700" : "text-slate-800"}`}>{item.type === "income" ? "+" : "−"}{formatCurrency(item.amount)}</td>
                <td className="px-3 py-3">{canEdit && <TransactionMenu transaction={item} placement={filteredTransactions.length > 1 && index === filteredTransactions.length - 1 ? "up" : "down"} onEdit={() => openEdit(item)} onDelete={() => setDeletingTransaction(item)} />}</td>
              </tr>)}
              {!filteredTransactions.length && <tr><td colSpan={9} className="p-10 text-center text-sm text-slate-400">Tidak ada transaksi yang sesuai dengan filter.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 lg:hidden">
          {filteredTransactions.map((item) => <article key={item.id} className="p-5">
            <div className="flex items-start gap-3">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>{item.type === "income" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{item.description}</p><p className="mt-1 text-xs text-slate-400">{item.date} · {item.method}</p><div className="mt-2"><CategoryBadge name={item.category} color={item.categoryColor} /></div></div><p className={`whitespace-nowrap text-sm font-semibold ${item.type === "income" ? "text-emerald-700" : "text-slate-900"}`}>{item.type === "income" ? "+" : "−"}{formatCurrency(item.amount)}</p></div>
                {item.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-5 text-slate-600">{item.notes}</p>}
                <div className="mt-3 flex items-center justify-between"><p className="text-xs text-slate-400">Dicatat oleh {item.createdByName}</p>{canEdit && <TransactionMenu transaction={item} onEdit={() => openEdit(item)} onDelete={() => setDeletingTransaction(item)} />}</div>
              </div>
            </div>
          </article>)}
          {!filteredTransactions.length && <p className="p-10 text-center text-sm text-slate-400">Tidak ada transaksi yang sesuai dengan filter.</p>}
        </div>
      </section>
    </div>

    {canEdit && <button onClick={openNew} className="fixed bottom-5 right-5 grid size-14 place-items-center rounded-full bg-[#123c32] text-white shadow-xl sm:hidden" aria-label="Tambah transaksi"><Plus size={24} /></button>}
    {canEdit && isFormOpen && <TransactionForm bookId={data.book.id} categories={data.categories} paymentMethods={data.paymentMethods} defaultDate={defaultDate} transaction={editingTransaction ?? undefined} onClose={closeForm} onSave={saveTransaction} />}
    {canEdit && deletingTransaction && <DeleteConfirmation transaction={deletingTransaction} onClose={() => setDeletingTransaction(null)} onConfirm={() => removeTransaction(deletingTransaction)} />}
  </main>;
}
