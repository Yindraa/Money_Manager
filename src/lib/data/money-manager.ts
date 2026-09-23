import "server-only";

import { redirect } from "next/navigation";
import type { BookMember, BookRole, DashboardData, ShareLink, TransactionRow } from "@/components/dashboard/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type MoneyManagerSearchParams = {
  month?: string | string[];
  book?: string | string[];
};

type RawTransaction = {
  id: string;
  transaction_date: string;
  description: string;
  category_id: string;
  payment_method_id: string;
  amount: number | string;
  type: "expense" | "income";
  notes: string | null;
  categories: { name: string; color: string } | null;
  payment_methods: { name: string } | null;
  creator: { display_name: string } | null;
};

type RawMonthlyExpense = {
  transaction_date: string;
  amount: number | string;
};

type LoadMoneyManagerOptions = {
  includeMonthlyTrend?: boolean;
};

function currentMonthInJakarta() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

export async function loadMoneyManagerData(query: MoneyManagerSearchParams, options: LoadMoneyManagerOptions = {}) {
  if (!isSupabaseConfigured()) redirect("/login?error=config");

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) redirect("/login");
  const isAnonymous = authData.claims.is_anonymous === true;

  const [{ data: profile }, { data: books, error: booksError }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).single(),
    supabase.from("books").select("id, name, owner_id").order("created_at", { ascending: true }),
  ]);

  if (booksError) throw new Error(booksError.message);
  const profileName = profile?.display_name || String(authData.claims.email || "Pengguna").split("@")[0];
  const email = String(authData.claims.email || "");
  const requestedMonth = query.month;
  const monthValue = typeof requestedMonth === "string" && /^20\d{2}-(0[1-9]|1[0-2])$/.test(requestedMonth)
    ? requestedMonth
    : currentMonthInJakarta();
  const month = `${monthValue}-01`;

  if (!books?.length && isAnonymous) redirect("/access-expired");
  if (!books?.length) return { data: null, profileName, email, month };

  const requestedBookId = typeof query.book === "string" ? query.book : null;
  const book = books.find((item) => item.id === requestedBookId) ?? books[0];
  const [selectedYear, selectedMonth] = monthValue.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(selectedYear, selectedMonth, 1)).toISOString().slice(0, 10);
  const trendStart = new Date(Date.UTC(selectedYear, selectedMonth - 6, 1)).toISOString().slice(0, 10);

  const [periodResult, categoriesResult, methodsResult, transactionsResult, membershipResult, membersResult, linksResult, monthlyTrendResult] = await Promise.all([
    supabase.from("monthly_periods").select("opening_balance").eq("book_id", book.id).eq("month", month).maybeSingle(),
    supabase.from("categories").select("id, name, color").eq("book_id", book.id).eq("is_active", true).order("name"),
    supabase.from("payment_methods").select("id, name").eq("book_id", book.id).eq("is_active", true).order("name"),
    supabase.from("transactions").select("id, transaction_date, description, category_id, payment_method_id, amount, type, notes, categories(name, color), payment_methods(name), creator:profiles!transactions_created_by_fkey(display_name)").eq("book_id", book.id).gte("transaction_date", month).lt("transaction_date", nextMonth).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("book_members").select("role, expires_at").eq("book_id", book.id).eq("user_id", userId).maybeSingle(),
    supabase.from("book_members").select("user_id, role, joined_at, expires_at, profiles(display_name)").eq("book_id", book.id).order("joined_at", { ascending: true }),
    supabase.from("share_links").select("id, role, expires_at, usage_count, max_uses, created_at").eq("book_id", book.id).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
    options.includeMonthlyTrend
      ? supabase.from("transactions").select("transaction_date, amount").eq("book_id", book.id).eq("type", "expense").gte("transaction_date", trendStart).lt("transaction_date", nextMonth)
      : Promise.resolve({ data: [] as RawMonthlyExpense[], error: null }),
  ]);

  const queryError = periodResult.error || categoriesResult.error || methodsResult.error || transactionsResult.error || membershipResult.error || membersResult.error || linksResult.error || monthlyTrendResult.error;
  if (queryError) throw new Error(queryError.message);

  const transactions = (transactionsResult.data as unknown as RawTransaction[]).map<TransactionRow>((row) => ({
    id: row.id,
    dateIso: row.transaction_date,
    date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${row.transaction_date}T00:00:00Z`)),
    description: row.description,
    categoryId: row.category_id,
    category: row.categories?.name ?? "Tanpa kategori",
    categoryColor: row.categories?.color ?? "#64748b",
    paymentMethodId: row.payment_method_id,
    method: row.payment_methods?.name ?? "—",
    amount: Number(row.amount),
    type: row.type,
    notes: row.notes,
    createdByName: row.creator?.display_name || "Pengguna",
  }));

  const members = (membersResult.data ?? []).map((member) => ({
    userId: member.user_id,
    displayName: (member.profiles as unknown as { display_name: string } | null)?.display_name || "Pengguna",
    role: member.role as BookRole,
    joinedAt: member.joined_at,
    expiresAt: member.expires_at,
  })) satisfies BookMember[];

  const shareLinks = (linksResult.data ?? []).map((link) => ({
    id: link.id,
    role: link.role as "editor" | "viewer",
    expiresAt: link.expires_at,
    usageCount: link.usage_count,
    maxUses: link.max_uses,
    createdAt: link.created_at,
  })) satisfies ShareLink[];

  const expenseByMonth = (monthlyTrendResult.data as RawMonthlyExpense[]).reduce((totals, item) => {
    const key = item.transaction_date.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + Number(item.amount));
    return totals;
  }, new Map<string, number>());
  const monthlyExpenseTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(selectedYear, selectedMonth - 6 + index, 1));
    const key = date.toISOString().slice(0, 7);
    return {
      month: key,
      label: new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(date),
      value: expenseByMonth.get(key) ?? 0,
    };
  });

  const data: DashboardData = {
    book: { id: book.id, name: book.name },
    books: books.map(({ id, name }) => ({ id, name })),
    role: (membershipResult.data?.role ?? (book.owner_id === userId ? "owner" : "viewer")) as BookRole,
    accessExpiresAt: membershipResult.data?.expires_at ?? null,
    members,
    shareLinks,
    profileName,
    month,
    monthLabel: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}T00:00:00Z`)),
    openingBalance: Number(periodResult.data?.opening_balance ?? 0),
    categories: categoriesResult.data ?? [],
    paymentMethods: methodsResult.data ?? [],
    transactions,
    monthlyExpenseTrend,
  };

  return { data, profileName, email, month };
}
