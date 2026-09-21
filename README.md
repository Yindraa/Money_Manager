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
- Supabase (tahap berikutnya)

## Status

Tahap pertama berisi prototipe dashboard responsif dengan data contoh dari spreadsheet: kartu ringkasan, grafik kategori, tren harian, pencarian transaksi, serta drawer tambah transaksi.

Validasi proyek:

```bash
pnpm lint
pnpm exec next build --webpack
```
