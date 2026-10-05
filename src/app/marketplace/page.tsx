import { getEffectiveUser } from "@/lib/effective-user";
import { getProducts, getPromotions } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import ShopClient from "./ShopClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SCCG Marketplace | Direct E-Commerce & Service Packages",
  description: "Buy SCCG service packages and products directly with instant order fulfillment.",
};

export default async function MarketplacePage() {
  const user = await getEffectiveUser();

  const [products, promotions, eurToBdtRate] = await Promise.all([
    getProducts(),
    getPromotions(),
    getEurToRate("BDT").catch(() => 140.2),
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
      user={user || undefined}
      liveEurToBdtRate={eurToBdtRate}
    />
  );
}
