import Link from "next/link";
import { ArrowLeft, CheckCircle2, Crown, Eye, Mail, MailCheck, PencilLine, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { LoginSubmitButton, PasswordSubmitButton } from "@/components/auth/login-submit-button";
import { PasswordInput } from "@/components/auth/password-input";
import { requestMagicLink, signInOwner } from "./actions";

const messages: Record<string, string> = {
  config: "Supabase belum dikonfigurasi. Isi .env.local terlebih dahulu.",
  email: "Masukkan alamat email yang valid.",
  send: "Tautan masuk gagal dikirim. Silakan coba lagi.",
  callback: "Tautan tidak valid, sudah digunakan, atau kedaluwarsa. Minta tautan baru lalu buka pada browser yang sama.",
  share: "Link undangan tidak valid. Minta pemilik buku membuat link baru.",
  credentials: "Masukkan email dan password yang valid.",
  password: "Email atau password salah. Jika belum punya password, gunakan Magic Link sekali lalu atur password di Pengaturan.",
};

const authMessages: Record<string, string> = {
  email_address_not_authorized: "Email ini belum diizinkan oleh SMTP bawaan Supabase. Gunakan email anggota organisasi Supabase atau pasang Custom SMTP.",
  over_email_send_rate_limit: "Batas pengiriman email Supabase telah tercapai. Tunggu beberapa saat atau pasang Custom SMTP.",
  over_request_rate_limit: "Terlalu banyak percobaan login. Tunggu beberapa menit sebelum mencoba kembali.",
  email_provider_disabled: "Login menggunakan email belum diaktifkan pada pengaturan Supabase Auth.",
  otp_disabled: "Login Magic Link/OTP belum diaktifkan pada pengaturan Supabase Auth.",
  email_address_invalid: "Alamat email ditolak oleh penyedia email Supabase.",
  unknown: "Supabase menolak permintaan Magic Link. Periksa Auth Logs untuk detailnya.",
};

const roles = [
  { name: "Owner", description: "Membuat buku dan mengatur akses anggota.", icon: Crown, tone: "bg-amber-400/15 text-amber-200" },
  { name: "Editor", description: "Mencatat dan memperbarui transaksi bersama.", icon: PencilLine, tone: "bg-emerald-400/15 text-emerald-200" },
  { name: "Viewer", description: "Melihat dashboard tanpa mengubah data.", icon: Eye, tone: "bg-sky-400/15 text-sky-200" },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const query = await searchParams;
  const errorKey = typeof query.error === "string" ? query.error : null;
  const authCode = typeof query.code === "string" ? query.code : "unknown";
  const error = errorKey === "auth" ? (authMessages[authCode] ?? `Supabase menolak permintaan login (kode: ${authCode}).`) : errorKey ? messages[errorKey] : null;
  const sent = query.sent === "1";
  const requestedNext = typeof query.next === "string" ? query.next : "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\") ? requestedNext : "/";
  const retryHref = next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return <main className="h-svh overflow-hidden bg-[#eef2ec] p-3 sm:p-5">
    <section className="mx-auto grid h-full w-full max-w-6xl overflow-hidden rounded-[1.5rem] border border-white/70 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden bg-[#123c32] p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full border border-white/10 bg-emerald-300/5" />
        <div className="pointer-events-none absolute -bottom-40 -left-28 size-[28rem] rounded-full border border-white/10 bg-white/[0.03]" />
        <div className="relative">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white text-[#123c32]"><WalletCards size={23} /></span><div><p className="font-semibold">Dompetku</p><p className="text-xs text-emerald-100/55">Money Manager</p></div></div>
          <div className="mt-12 max-w-lg"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-emerald-100"><Sparkles size={14} /> Keuangan bersama, tetap terkendali</span><h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.05em] xl:text-5xl">Satu akun untuk setiap peran.</h1><p className="mt-4 max-w-md text-sm leading-6 text-emerald-50/65">Owner mengelola buku, sementara akses viewer dan editor diberikan melalui link sementara.</p></div>
        </div>
        <div className="relative grid gap-2">{roles.map(({ name, description, icon: Icon, tone }) => <div key={name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm"><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={16} /></span><div><p className="text-sm font-semibold">{name}</p><p className="text-xs text-emerald-50/55">{description}</p></div><CheckCircle2 className="ml-auto text-emerald-200/60" size={16} /></div>)}</div>
      </aside>

      <div className="flex min-h-0 items-center justify-center overflow-y-auto p-5 sm:p-7 lg:p-8 xl:p-10">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 lg:hidden"><span className="grid size-11 place-items-center rounded-2xl bg-[#123c32] text-white"><WalletCards size={22} /></span><div><p className="font-semibold text-slate-900">Dompetku</p><p className="text-xs text-slate-400">Money Manager</p></div></div>

          <div className="mt-6 lg:mt-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><ShieldCheck size={14} /> Area owner</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Selamat datang kembali</h2>
            <p className="mt-2 text-sm leading-5 text-slate-500">Masuk sebagai owner dengan email dan password.</p>
          </div>

          {sent ? <div className="mt-5">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><span className="grid size-9 place-items-center rounded-lg bg-white text-emerald-700 shadow-sm"><MailCheck size={18} /></span><h3 className="mt-3 font-semibold text-emerald-950">Periksa email Anda</h3><p className="mt-1 text-sm leading-5 text-emerald-800/75">Buka tautan yang dikirim menggunakan browser ini.</p></div>
            <Link href={retryHref} className="secondary-button mt-3 w-full">Kirim ulang atau gunakan email lain</Link>
          </div> : <div className="mt-5">
            {error && <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</div>}
            <form action={signInOwner} className="space-y-3">
              <input type="hidden" name="next" value={next} />
              <label className="form-label">Alamat email<div className="relative mt-1.5"><Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input name="email" type="email" autoComplete="email" className="form-input form-input-leading h-11 py-0" placeholder="owner@email.com" required autoFocus /></div></label>
              <label className="form-label">Password<div className="mt-1.5"><PasswordInput placeholder="Minimal 8 karakter" /></div></label>
              <PasswordSubmitButton />
            </form>
            <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">Belum pernah mengatur password?</summary>
              <p className="mt-1 text-xs leading-5 text-slate-500">Gunakan Magic Link sekali, lalu buat password di Pengaturan.</p>
              <form action={requestMagicLink} className="mt-3 space-y-2"><input type="hidden" name="next" value={next} /><input name="email" type="email" autoComplete="email" className="form-input h-10 py-0" placeholder="owner@email.com" required /><LoginSubmitButton /></form>
            </details>
          </div>}

          <p className="mt-3 text-center text-xs text-slate-400">Viewer dan editor masuk langsung melalui link sementara.</p>
          <Link href="/" className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"><ArrowLeft size={16} /> Kembali ke dashboard</Link>
        </div>
      </div>
    </section>
  </main>;
}
