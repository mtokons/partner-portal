import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getProducts, getPromotions } from "@/lib/sharepoint";
import ShopClient from "./ShopClient";

export const metadata = {
  title: "SCCG Marketplace | Direct E-Commerce",
  description: "Buy SCCG service packages and products directly with instant order fulfillment.",
};

export default async function MarketplacePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const [products, promotions] = await Promise.all([
    getProducts(),
    getPromotions(),
  ]);

  // Sort products for marketplace display
  const sorted = [...products].sort((a, b) => {
    const oA = a.sortOrder ?? 999;
    const oB = b.sortOrder ?? 999;
    if (oA !== oB) return oA - oB;
    return a.name.localeCompare(b.name);
  });

  const now = new Date();
  const activePromos = promotions
    .filter((p) => p.isActive && new Date(p.startDate) <= now && (!p.endDate || new Date(p.endDate) >= now))
    .sort((a, b) => a.priority - b.priority);

  return (
    <ShopClient
      products={sorted}
      promotions={activePromos}
      user={user}
    />
  );
}
