import { redirect } from "next/navigation";
import { ShareAccept } from "@/components/sharing/share-accept";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) redirect("/login?error=share");

  return <ShareAccept token={token} />;
}
