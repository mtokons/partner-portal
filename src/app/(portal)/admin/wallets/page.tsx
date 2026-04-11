import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getAllCoinWallets, getPartners } from "@/lib/sharepoint";
import WalletsClient from "./WalletsClient";

export default async function AdminWalletsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/dashboard");

  const wallets = await getAllCoinWallets();
  const partners = await getPartners();

  return <WalletsClient wallets={wallets} partners={partners} />;
}
