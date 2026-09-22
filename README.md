# Dompetku — Money Manager

Aplikasi pencatatan dana bulanan yang berfokus pada dana awal, total pengeluaran, sisa dana, dan detail transaksi.

## Menjalankan proyek

```bash
pnpm install
pnpm dev
```

Buka `http://localhost:3000`.

## Stack

- Next.js App Router dan TypeScript
- Tailwind CSS
- Recharts
- Lucide React
- Supabase PostgreSQL, Auth, Realtime, dan Row Level Security

## Status

Dashboard sudah terhubung ke Supabase: pengguna masuk melalui Magic Link, membuat buku keuangan pertama, menentukan dana awal, menyimpan transaksi, melihat ringkasan dan grafik dari data nyata, serta menerima pembaruan transaksi melalui Realtime.

Validasi proyek:

```bash
pnpm lint
pnpm exec next build --webpack
```

## Menghubungkan Supabase Cloud

1. Buat project baru di Supabase.
2. Salin `.env.example` menjadi `.env.local`.
3. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dari menu **Connect** di dashboard Supabase.
4. Isi `NEXT_PUBLIC_SITE_URL=http://localhost:3000` untuk development.
5. Hubungkan CLI dan terapkan migration:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref PROJECT_REF_ANDA
pnpm db:push
```

Untuk Magic Link SSR, ubah tautan pada template email Supabase menjadi:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

Tambahkan `http://localhost:3000/auth/confirm` dan URL produksi nantinya ke daftar redirect URL pada pengaturan Auth. Jangan pernah commit `.env.local` atau secret key Supabase.
