import { Dashboard } from "@/components/dashboard/dashboard";
import { Onboarding } from "@/components/dashboard/onboarding";
import { loadMoneyManagerData, type MoneyManagerSearchParams } from "@/lib/data/money-manager";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<MoneyManagerSearchParams> }) {
  const result = await loadMoneyManagerData(await searchParams);
  if (!result.data) return <Onboarding profileName={result.profileName} month={result.month} />;
  return <Dashboard data={result.data} />;
}
