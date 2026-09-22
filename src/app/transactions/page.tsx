import { redirect } from "next/navigation";
import { TransactionsPage } from "@/components/transactions/transactions-page";
import { loadMoneyManagerData, type MoneyManagerSearchParams } from "@/lib/data/money-manager";

export const dynamic = "force-dynamic";

export default async function TransactionsRoute({ searchParams }: { searchParams: Promise<MoneyManagerSearchParams> }) {
  const result = await loadMoneyManagerData(await searchParams);
  if (!result.data) redirect("/");
  return <TransactionsPage data={result.data} />;
}
