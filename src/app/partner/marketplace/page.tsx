import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getProducts } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import MarketplaceClient from "./MarketplaceClient";

export default async function PartnerMarketplacePage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const isAdmin = (user.roles || [user.role]).includes("admin");
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const allProducts = await getProducts();
  const secCur = partner.preferredCurrency || "BDT";
  const rate = secCur !== "EUR" ? await getEurToRate(secCur) : 1;

  const downloads = allProducts.filter(
    (p) => (p.category === "partner-downloads" || p.contentType) && p.isAvailable !== false
  );
  // All non-download, available products for "All Products & Services" tab
  const allServices = allProducts.filter(
    (p) => p.category !== "partner-downloads" && !p.contentType && p.isAvailable !== false
  ).sort((a, b) => {
    const oA = a.sortOrder ?? 999;
    const oB = b.sortOrder ?? 999;
    if (oA !== oB) return oA - oB;
    return a.name.localeCompare(b.name);
  });

  return (
    <MarketplaceClient
      downloads={downloads}
      allServices={allServices}
      secCur={secCur}
      rate={rate}
      isAdmin={isAdmin}
    />
  );
}
