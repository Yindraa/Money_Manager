import { redirect } from "next/navigation";
import { SettingsPage } from "@/components/settings/settings-page";
import { loadMoneyManagerData, type MoneyManagerSearchParams } from "@/lib/data/money-manager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsRoute({ searchParams }: { searchParams: Promise<MoneyManagerSearchParams> }) {
  const result = await loadMoneyManagerData(await searchParams);
  if (!result.data) redirect("/");

  const supabase = await createClient();
  const [categoriesResult, methodsResult] = await Promise.all([
    supabase.from("categories").select("id, name, color, is_active").eq("book_id", result.data.book.id).order("name"),
    supabase.from("payment_methods").select("id, name, is_active").eq("book_id", result.data.book.id).order("name"),
  ]);
  const error = categoriesResult.error || methodsResult.error;
  if (error) throw new Error(error.message);

  return <SettingsPage
    data={result.data}
    email={result.email}
    categories={(categoriesResult.data ?? []).map((item) => ({ id: item.id, name: item.name, color: item.color, isActive: item.is_active }))}
    paymentMethods={(methodsResult.data ?? []).map((item) => ({ id: item.id, name: item.name, isActive: item.is_active }))}
  />;
}
