import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getCandidateById, getCandidateServices, getProducts } from "@/lib/sharepoint";
import { WizardShell } from "@/app/partner/candidates/new/WizardShell";
import { Repository } from "@/lib/repository";

export default async function SccgRegisterCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{ candidateId?: string; email?: string; name?: string }>;
}) {
  await requirePermission("candidate.create");
  const { candidateId, email, name } = await searchParams;
  const [products, partners] = await Promise.all([
    getProducts(),
    Repository.partners.getAll(),
  ]);
  const existingCandidate = candidateId ? await getCandidateById(candidateId) : null;
  if (candidateId && !existingCandidate) notFound();
  const existingServices = existingCandidate ? await getCandidateServices(existingCandidate.id) : [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">{existingCandidate ? "Register a Service" : "Register Candidate"}</h1>
      {existingCandidate ? (
        <p className="text-sm text-muted-foreground mb-6">Adding services for <span className="font-semibold text-foreground">{existingCandidate.fullName}</span> · {existingServices.length} existing service{existingServices.length === 1 ? "" : "s"}</p>
      ) : <div className="mb-6" />}
      <WizardShell
        partnerMargin={existingCandidate?.marginPercentage || 15}
        partnerId={existingCandidate?.partnerId || "SCCG-DIRECT"}
        products={products}
        availablePartners={partners.map(p => ({ id: p.id, companyName: p.companyName }))}
        routeBase="/sccg/candidates"
        secondaryCurrency="EUR"
        exchangeRate={1}
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
        prefill={!existingCandidate && (email || name) ? { name: name || "", email: email || "", phone: "", notes: "" } : undefined}
      />
    </div>
  );
}