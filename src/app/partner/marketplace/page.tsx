import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getProducts } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import MarketplaceClient from "./MarketplaceClient";

export default async function PartnerMarketplacePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
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
    />
  );
}
