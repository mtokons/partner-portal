import { redirect } from "next/navigation";
import Link from "next/link";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getCandidates, getCandidateServices, getPartnerByEmail, getProducts, getSalesOffers } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import { UserPlus, Users } from "lucide-react";
import CandidateListClient from "./CandidateListClient";

export default async function CandidatesPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = (user.roles || [user.role]) as string[];
  const isAdmin = roles.includes("admin");

  let partnerId: string | undefined;
  let secCur = "BDT";
  let partnerMargin = 15;
  if (!isAdmin) {
    const partner = await getPartnerByEmail(user.email!);
    if (!partner) redirect("/partner-pending");
    partnerId = partner.id;
    secCur = partner.preferredCurrency || "BDT";
    partnerMargin = partner.marginPercentage || 15;
  }

  const [candidates, rate, products, allOffers] = await Promise.all([
    getCandidates(partnerId),
    secCur !== "EUR" ? getEurToRate(secCur) : Promise.resolve(1),
    getProducts(),
    getSalesOffers(partnerId),
  ]);

  // Fetch services for each candidate
  const candidatesWithServices = await Promise.all(
    candidates.map(async (c) => {
      const services = await getCandidateServices(c.id);
      return { ...c, services };
    })
  );

  // Build "waiting for registration" list: accepted offers whose email
  // has no matching registered candidate for this partner
  const registeredEmails = new Set(candidates.map((c) => c.email.toLowerCase().trim()));
  const acceptedOffers = allOffers.filter((o) => o.status === "accepted");
  const waitingOffers = acceptedOffers
    .filter((o) => {
      const email = (o.clientEmail || "").toLowerCase().trim();
      return email && !registeredEmails.has(email);
    })
    .map((o) => ({
      offerId: o.id,
      offerNumber: o.offerNumber,
      name: o.clientName || o.prospectName || "",
      email: o.clientEmail || o.prospectEmail || "",
      totalAmount: o.totalAmount,
      acceptedAt: o.acceptedAt,
    }));

  // Deduplicate by email (keep latest accepted offer per email)
  const seenEmails = new Set<string>();
  const dedupedWaiting = waitingOffers.filter((w) => {
    const e = w.email.toLowerCase();
    if (seenEmails.has(e)) return false;
    seenEmails.add(e);
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">My Candidates</h1>
          <span className="text-sm text-muted-foreground ml-2">({candidates.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/partner/candidates/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Register a New Candidate
          </Link>
        </div>
      </div>

      <CandidateListClient
        candidates={candidatesWithServices}
        products={products}
        partnerMargin={partnerMargin as import("@/types").PartnerMargin}
        secondaryCurrency={secCur}
        exchangeRate={rate}
        waitingOffers={dedupedWaiting}
      />
    </div>
  );
}
