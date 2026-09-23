"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, CreditCard, Eye, EyeOff, KeyRound, LayoutDashboard, ListFilter, LogOut, Plus, Save, Settings, Share2, Tag, UserRound, WalletCards } from "lucide-react";
import { createCategory, createPaymentMethod, setOwnerPassword, signOut, updateBookName, updateCategory, updatePaymentMethod, updateProfileName } from "@/app/actions/settings";
import { ShareDialog } from "@/components/dashboard/dashboard";
import type { DashboardData } from "@/components/dashboard/types";
import { useToast } from "@/components/ui/toast-provider";

type CategorySetting = { id: string; name: string; color: string; isActive: boolean };
type MethodSetting = { id: string; name: string; isActive: boolean };

function Feedback({ error }: { error: string | null }) {
  return error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null;
}

function CategoryRow({ item, bookId, readOnly }: { item: CategorySetting; bookId: string; readOnly: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(item.name);
  const [color, setColor] = useState(item.color);
  const [isActive, setIsActive] = useState(item.isActive);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      try { await toast.track(() => updateCategory({ bookId, id: item.id, name, color, isActive }), { loading: "Menyimpan kategori...", success: "Kategori berhasil diperbarui." }); router.refresh(); }
      catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Kategori gagal disimpan."); }
    });
  }

  return <div className={`rounded-xl border p-3 ${isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-70"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} disabled={readOnly || isPending} className="size-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 disabled:cursor-default" aria-label={`Warna ${item.name}`} /><input value={name} onChange={(event) => setName(event.target.value)} disabled={readOnly || isPending} className="form-input h-10 flex-1 py-0 disabled:bg-transparent" maxLength={60} /><span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isActive ? "text-emerald-700" : "text-slate-400"}`}>{isActive ? <Eye size={14} /> : <EyeOff size={14} />}{isActive ? "Aktif" : "Nonaktif"}</span>{!readOnly && <><button type="button" onClick={() => setIsActive((value) => !value)} disabled={isPending} className="secondary-button">{isActive ? "Nonaktifkan" : "Aktifkan"}</button><button type="button" onClick={save} disabled={isPending || !name.trim()} className="icon-button bg-emerald-50 text-emerald-700" aria-label={`Simpan ${item.name}`}><Save size={16} /></button></>}</div><Feedback error={error} /></div>;
}

function MethodRow({ item, bookId, readOnly }: { item: MethodSetting; bookId: string; readOnly: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(item.name);
  const [isActive, setIsActive] = useState(item.isActive);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      try { await toast.track(() => updatePaymentMethod({ bookId, id: item.id, name, isActive }), { loading: "Menyimpan metode pembayaran...", success: "Metode pembayaran berhasil diperbarui." }); router.refresh(); }
      catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Metode pembayaran gagal disimpan."); }
    });
  }

  return <div className={`rounded-xl border p-3 ${isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-70"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><CreditCard size={17} /></span><input value={name} onChange={(event) => setName(event.target.value)} disabled={readOnly || isPending} className="form-input h-10 flex-1 py-0 disabled:bg-transparent" maxLength={40} /><span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isActive ? "text-emerald-700" : "text-slate-400"}`}>{isActive ? <Eye size={14} /> : <EyeOff size={14} />}{isActive ? "Aktif" : "Nonaktif"}</span>{!readOnly && <><button type="button" onClick={() => setIsActive((value) => !value)} disabled={isPending} className="secondary-button">{isActive ? "Nonaktifkan" : "Aktifkan"}</button><button type="button" onClick={save} disabled={isPending || !name.trim()} className="icon-button bg-emerald-50 text-emerald-700" aria-label={`Simpan ${item.name}`}><Save size={16} /></button></>}</div><Feedback error={error} /></div>;
}

export function SettingsPage({ data, email, categories, paymentMethods }: { data: DashboardData; email: string; categories: CategorySetting[]; paymentMethods: MethodSetting[] }) {
  const router = useRouter();
  const toast = useToast();
  const monthValue = data.month.slice(0, 7);
  const [profileName, setProfileName] = useState(data.profileName);
  const [bookName, setBookName] = useState(data.book.name);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#2f7d68");
  const [newMethodName, setNewMethodName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isOwner = data.role === "owner";
  const canManageOptions = isOwner;

  function mutate(task: () => Promise<unknown>, messages: { loading: string; success: string; error?: string }, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try { await toast.track(task, messages); after?.(); router.refresh(); }
      catch (mutationError) { setError(mutationError instanceof Error ? mutationError.message : "Pengaturan gagal disimpan."); }
    });
  }

  function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutate(() => createCategory({ bookId: data.book.id, name: newCategoryName, color: newCategoryColor }), { loading: "Menambahkan kategori...", success: "Kategori baru berhasil ditambahkan." }, () => setNewCategoryName(""));
  }

  function addMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutate(() => createPaymentMethod({ bookId: data.book.id, name: newMethodName }), { loading: "Menambahkan metode pembayaran...", success: "Metode pembayaran berhasil ditambahkan." }, () => setNewMethodName(""));
  }

  function changeBook(bookId: string) { if (bookId) router.push(`/settings?book=${bookId}&month=${monthValue}`); }
  return <main className="min-h-screen bg-[#f3f5f1] text-slate-950">
    <header className="border-b border-slate-200/80 bg-[#f8faf7]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center px-4 py-3 sm:px-7 lg:px-10">
        <div className="flex min-w-0 items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#123c32] text-white"><WalletCards size={21} /></div><div className="min-w-0"><select value={data.book.id} onChange={(event) => changeBook(event.target.value)} className="max-w-[10rem] bg-transparent text-[15px] font-semibold outline-none sm:max-w-[15rem]" aria-label="Pilih buku keuangan">{data.books.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}</select><p className="text-xs capitalize text-slate-400">{data.role} · Money Manager</p></div></div>
      </div>
      <nav className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 sm:px-7 lg:px-10" aria-label="Navigasi utama"><Link href={`/?book=${data.book.id}&month=${monthValue}`} className="inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-slate-500"><LayoutDashboard size={16} /> Dashboard</Link><Link href={`/transactions?book=${data.book.id}&month=${monthValue}`} className="inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-slate-500"><ListFilter size={16} /> Transaksi</Link><Link href={`/settings?book=${data.book.id}&month=${monthValue}`} className="inline-flex shrink-0 items-center gap-2 border-b-2 border-emerald-700 px-3 py-3 text-sm font-semibold text-emerald-800"><Settings size={16} /> Pengaturan</Link></nav>
    </header>

    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-7 lg:py-10"><div><p className="text-sm font-semibold text-emerald-700">Pengaturan</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Sesuaikan ruang keuangan</h1><p className="mt-2 text-sm text-slate-500">Kelola identitas, buku, dan pilihan yang digunakan saat mencatat transaksi.</p></div><Feedback error={error} />

      <div className="mt-7 grid gap-4 lg:grid-cols-2"><section className="panel"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UserRound size={18} /></span><div><h2 className="panel-title">Profil saya</h2><p className="panel-subtitle">Identitas yang terlihat oleh anggota lain</p></div></div><label className="form-label mt-5">Nama tampilan<input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="form-input mt-2" maxLength={80} /></label><label className="form-label mt-4">Email<input value={email} readOnly className="form-input mt-2 bg-slate-50 text-slate-500" /></label><button type="button" disabled={isPending || profileName.trim().length < 2} onClick={() => mutate(() => updateProfileName(profileName), { loading: "Menyimpan profil...", success: "Profil berhasil diperbarui." })} className="primary-button mt-5"><Save size={16} /> Simpan profil</button></section>

        <section className="panel"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><BookOpen size={18} /></span><div><h2 className="panel-title">Buku keuangan</h2><p className="panel-subtitle">Hanya owner yang dapat mengganti nama</p></div></div><label className="form-label mt-5">Nama buku<input value={bookName} onChange={(event) => setBookName(event.target.value)} disabled={!isOwner} className="form-input mt-2 disabled:bg-slate-50 disabled:text-slate-500" maxLength={80} /></label><div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Akses Anda: <strong className="capitalize text-slate-800">{data.role}</strong></div>{isOwner && <button type="button" disabled={isPending || bookName.trim().length < 2} onClick={() => mutate(() => updateBookName(data.book.id, bookName), { loading: "Menyimpan nama buku...", success: "Nama buku berhasil diperbarui." })} className="primary-button mt-5"><Save size={16} /> Simpan nama buku</button>}</section></div>

      {isOwner && <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="panel"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Share2 size={18} /></span><div><h2 className="panel-title">Akses sementara</h2><p className="panel-subtitle">Atur link, role, durasi, dan anggota</p></div></div><p className="mt-5 text-sm leading-6 text-slate-500">Semua viewer dan editor memperoleh akses sementara. Saat durasi berakhir, buat dan bagikan link baru.</p><button type="button" onClick={() => setIsShareOpen(true)} className="primary-button mt-5"><Share2 size={16} /> Kelola akses</button></section>
        <section className="panel">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><KeyRound size={18} /></span><div><h2 className="panel-title">Password owner</h2><p className="panel-subtitle">Login tanpa meminta email Supabase</p></div></div>
          <div className="mt-5 grid gap-3">
            <div className="relative"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="form-input pr-12" placeholder="Password baru (minimal 8 karakter)" minLength={8} maxLength={72} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            <div className="relative"><input type={showPassword ? "text" : "password"} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className="form-input pr-12" placeholder="Ulangi password baru" minLength={8} maxLength={72} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={showPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          </div>
          <button type="button" disabled={isPending || password.length < 8 || password !== passwordConfirmation} onClick={() => mutate(() => setOwnerPassword({ bookId: data.book.id, password, confirmation: passwordConfirmation }), { loading: "Menyimpan password...", success: "Password owner berhasil dibuat." }, () => { setPassword(""); setPasswordConfirmation(""); setShowPassword(false); })} className="primary-button mt-5"><KeyRound size={16} /> Simpan password</button>
        </section>
      </div>}

      <section className="panel mt-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><Tag size={18} /></span><div><h2 className="panel-title">Kategori transaksi</h2><p className="panel-subtitle">Kategori nonaktif tetap tersimpan pada transaksi lama</p></div></div>{canManageOptions && <form onSubmit={addCategory} className="mt-5 grid gap-3 sm:grid-cols-[48px_1fr_auto]"><input type="color" value={newCategoryColor} onChange={(event) => setNewCategoryColor(event.target.value)} className="h-11 w-12 cursor-pointer rounded-xl border border-slate-200 bg-white p-1" aria-label="Warna kategori baru" /><input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} className="form-input h-11 py-0" placeholder="Nama kategori baru" maxLength={60} required /><button className="primary-button h-11" disabled={isPending}><Plus size={16} /> Tambah</button></form>}<div className="mt-5 grid gap-2">{categories.map((item) => <CategoryRow key={item.id} item={item} bookId={data.book.id} readOnly={!canManageOptions} />)}</div></section>

      <section className="panel mt-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-700"><CreditCard size={18} /></span><div><h2 className="panel-title">Metode pembayaran</h2><p className="panel-subtitle">Pilihan yang tersedia pada form transaksi</p></div></div>{canManageOptions && <form onSubmit={addMethod} className="mt-5 flex flex-col gap-3 sm:flex-row"><input value={newMethodName} onChange={(event) => setNewMethodName(event.target.value)} className="form-input h-11 flex-1 py-0" placeholder="Contoh: Debit BCA" maxLength={40} required /><button className="primary-button h-11" disabled={isPending}><Plus size={16} /> Tambah</button></form>}<div className="mt-5 grid gap-2">{paymentMethods.map((item) => <MethodRow key={item.id} item={item} bookId={data.book.id} readOnly={!canManageOptions} />)}</div></section>

      <section className="mt-4 flex flex-col justify-between gap-4 rounded-[1.25rem] border border-red-100 bg-red-50 p-5 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-red-950">Keluar dari akun</h2><p className="mt-1 text-sm text-red-700/70">Sesi pada browser ini akan dihapus. Data Anda tetap aman.</p></div><form action={signOut}><button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-100"><LogOut size={17} /> Keluar</button></form></section>
    </div>
    {isOwner && isShareOpen && <ShareDialog data={data} onClose={() => setIsShareOpen(false)} />}
  </main>;
}
