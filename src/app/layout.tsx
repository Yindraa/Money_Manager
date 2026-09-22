import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dompetku — Money Manager",
  description: "Kelola dana bulanan dan catat setiap pengeluaran dengan mudah.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full"><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
