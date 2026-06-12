import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getProducts, getCandidateById, getCandidateServices } from "@/lib/sharepoint";

import { WizardShell } from "@/app/partner/candidates/new/WizardShell";

/**
 * Admin / SCCG Staff — Register Candidate (Direct Sale)
 *
 * Same wizard as partner registration but with:
 * - 0% margin (SCCG keeps 100%)
 * - EUR as default currency
 * - partnerId = "SCCG-DIRECT" (internal direct-sale marker)
 * - Success links point to admin routes
 */
export default async function AdminRegisterCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{
    candidateId?: string;
    prefill?: string;
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  }>;
}) {
  const { candidateId, prefill, name, email, phone, notes } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = (user.roles || [user.role]) as string[];
  if (!roles.includes("admin")) redirect("/login");

  const products = await getProducts();

  // Load existing candidate if candidateId provided (Register a Service flow)
  let existingCandidate: Awaited<ReturnType<typeof getCandidateById>> | null = null;
  let existingServices: Awaited<ReturnType<typeof getCandidateServices>> = [];
  if (candidateId) {
    existingCandidate = await getCandidateById(candidateId);
    if (existingCandidate) {
      existingServices = await getCandidateServices(candidateId);
    }
  }

  const isServiceMode = !!existingCandidate;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-1">
        {isServiceMode ? "Register a Service" : "Register Candidate (Direct Sale)"}
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
      {!isServiceMode && (
        <p className="text-sm text-muted-foreground mb-6">
          SCCG direct enrollment — no partner commission
        </p>
      )}
      <WizardShell
        partnerMargin={0}
        partnerId="SCCG-DIRECT"
        products={products}
        secondaryCurrency="EUR"
        exchangeRate={1}
        adminMode
        prefill={prefill === "1" ? { name: name || "", email: email || "", phone: phone || "", notes: notes || "" } : undefined}
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
      />
    </div>
  );
}
