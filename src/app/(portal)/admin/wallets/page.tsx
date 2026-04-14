import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getAllCoinWallets, getPartners, getCustomers, getExperts } from "@/lib/sharepoint";
import WalletsClient from "./WalletsClient";

export default async function AdminWalletsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/dashboard");

  const wallets = await getAllCoinWallets();
  const [partners, customers, experts] = await Promise.all([
    getPartners(),
    getCustomers(),
    getExperts(),
  ]);

  // Combine into a generic list
  const users = [
    ...partners.map(p => ({ id: p.id, name: p.name, email: p.email, role: p.role })),
    ...customers.map(c => ({ id: c.id, name: c.name, email: c.email, role: "customer" })),
    ...experts.map(e => ({ id: e.id, name: e.name, email: e.email, role: "expert" })),
  ];

  return <WalletsClient wallets={wallets} users={users} />;
}
