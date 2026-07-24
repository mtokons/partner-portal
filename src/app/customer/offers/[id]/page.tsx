import { getEffectiveSession } from "@/lib/effective-user";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyOfferDetail, getPartnerPaymentInfo } from "@/app/customer/candidate-actions";
import { getCandidates, getProducts, getPartners, getCandidateServices } from "@/lib/sharepoint";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import OfferDetailClient from "./OfferDetailClient";
import type { SessionUser } from "@/types";

export default async function CustomerOfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/customer-login");

  const user = session.user as SessionUser;
  const { id } = await params;
  const result = await getMyOfferDetail(id);

  if (!result) {
    return (
      <div className="space-y-6">
        <Link href="/customer/offers" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Offers
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Offer not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { offer, items } = result;

  // Fetch products, candidates for this partner, partner info — all in parallel
  const [products, allCandidates, partners, paymentInfo] = await Promise.all([
    getProducts().catch(() => []),
    getCandidates(offer.partnerId).catch(() => []),
    getPartners().catch(() => []),
    getPartnerPaymentInfo(offer.partnerId),
  ]);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  // Find if this user is already a registered candidate under this partner
  const emailLower = (user.email || "").toLowerCase().trim();
  const existingCandidate =
    allCandidates.find((c) => c.email.toLowerCase().trim() === emailLower) ?? null;

  // Fetch services for the existing candidate if found
  const existingServices = existingCandidate
    ? await getCandidateServices(existingCandidate.id).catch(() => [])
    : [];

  // Partner contact info
  const partner = partners.find((p) => p.id === offer.partnerId);

  return (
    <OfferDetailClient
      offer={offer}
      items={items}
      productMap={productMap}
      existingCandidate={existingCandidate}
      existingServices={existingServices}
      partnerPaymentInfo={paymentInfo}
      partnerEmail={partner?.email}
      partnerPhone={partner?.phone}
    />
  );
}

