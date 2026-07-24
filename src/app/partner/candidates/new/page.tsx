import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getProducts, getCandidateById, getCandidateServices } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import { getPartnerPaymentInfoById } from "@/app/partner/settings/actions";

import { WizardShell } from "./WizardShell";

export default async function RegisterCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{ candidateId?: string; email?: string; name?: string; offerId?: string }>;
}) {
  const { candidateId, email, name } = await searchParams;
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const margin = partner.marginPercentage || 15;
  const secCur = partner.preferredCurrency || "BDT";
  const [products, rate, partnerPaymentInfo] = await Promise.all([
    getProducts(),
    secCur !== "EUR" ? getEurToRate(secCur) : Promise.resolve(1),
    getPartnerPaymentInfoById(partner.id),
  ]);

  // Load existing candidate if candidateId provided (Register a Service flow)
  let existingCandidate: Awaited<ReturnType<typeof getCandidateById>> | null = null;
  let existingServices: Awaited<ReturnType<typeof getCandidateServices>> = [];
  if (candidateId) {
    existingCandidate = await getCandidateById(candidateId);
    if (existingCandidate && existingCandidate.partnerId !== partner.id) {
      existingCandidate = null; // Not owned by this partner
    }
    if (existingCandidate) {
      existingServices = await getCandidateServices(candidateId);
    }
  }

  const isServiceMode = !!existingCandidate;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-1">
        {isServiceMode ? "Register a Service" : "Register Candidate"}
      </h1>
      {isServiceMode && existingCandidate && (
        <p className="text-sm text-muted-foreground mb-6">
          Adding services for <span className="font-semibold text-foreground">{existingCandidate.fullName}</span>
          {existingCandidate.sccgId && (
            <span className="ml-1 font-mono text-xs">({existingCandidate.sccgId})</span>
          )}
          {" · "}{existingServices.length} existing service{existingServices.length !== 1 ? "s" : ""}
        </p>
      )}
      {!isServiceMode && <div className="mb-6" />}
      <WizardShell
        partnerMargin={margin}
        partnerId={partner.id}
        products={products}
        secondaryCurrency={secCur}
        exchangeRate={rate}
        partnerPaymentInfo={partnerPaymentInfo ?? undefined}
        existingCandidate={existingCandidate ? {
          id: existingCandidate.id,
          fullName: existingCandidate.fullName,
          dateOfBirth: existingCandidate.dateOfBirth,
          email: existingCandidate.email,
          phone: existingCandidate.phone,
          address: existingCandidate.address,
          passportNumber: existingCandidate.passportNumber,
          nationalId: existingCandidate.nationalId,
          nationality: existingCandidate.nationality,
          country: existingCandidate.country,
          workflowCategory: existingCandidate.workflowCategory,
        } : undefined}
        prefill={!existingCandidate && (email || name) ? {
          name: name || "",
          email: email || "",
          phone: "",
          notes: "",
        } : undefined}
      />
    </div>
  );
}
