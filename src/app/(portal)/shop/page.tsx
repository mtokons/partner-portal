import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getProducts, getPromotions, getClients } from "@/lib/sharepoint";
import ShopClient from "./ShopClient";

export const metadata = {
  title: "Sales Shop | SCCG Partner Portal",
  description: "Browse SCCG products, configure your B2B offer, and start the sales workflow.",
};

export default async function ShopPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const partnerId = user.role === "admin" ? undefined : user.partnerId;

  const [products, promotions, clients] = await Promise.all([
    getProducts(),
    getPromotions(),
    getClients(partnerId),
  ]);

  // Sort products by sortOrder or name
  const sorted = [...products].sort((a, b) => {
    const oA = a.sortOrder ?? 999;
    const oB = b.sortOrder ?? 999;
    if (oA !== oB) return oA - oB;
    return a.name.localeCompare(b.name);
  });

  // Only show active promotions in slider
  const now = new Date();
  const activePromos = promotions
    .filter((p) => p.isActive && new Date(p.startDate) <= now && (!p.endDate || new Date(p.endDate) >= now))
    .sort((a, b) => a.priority - b.priority);

  return (
    <ShopClient
      products={sorted}
      promotions={activePromos}
      clients={clients}
      user={user}
    />
  );
}
