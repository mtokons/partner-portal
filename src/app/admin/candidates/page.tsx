import { getCandidates, getPartners } from "@/lib/sharepoint";
import { WORKFLOW_ORDERED_STATUSES } from "@/lib/engine/candidate-workflow";
import AdminCandidatesClient from "./AdminCandidatesClient";

export default async function AdminCandidatesPage() {
  const [candidates, partners] = await Promise.all([getCandidates(), getPartners()]);

  // Build a unique set of all statuses actually in use
  const allOrderedStatuses = Object.values(WORKFLOW_ORDERED_STATUSES).flat();
  const statusesInUse = new Set(candidates.map((c) => c.currentStatus as string));
  // Preserve workflow order but only include statuses that exist
  const allStatuses = [...new Set(allOrderedStatuses)].filter((s) => statusesInUse.has(s));

  const partnerOptions = partners
    .filter((p) => p.status === "active" || candidates.some((c) => c.partnerId === p.id))
    .map((p) => ({ id: p.id, name: p.company || p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const candidateRows = candidates.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    sccgId: c.sccgId,
    email: c.email,
    partnerId: c.partnerId,
    partnerName: c.partnerName ?? partners.find((p) => p.id === c.partnerId)?.company ?? partners.find((p) => p.id === c.partnerId)?.name,
    workflowCategory: c.workflowCategory,
    currentStatus: c.currentStatus as string,
    totalServiceFee: c.totalServiceFee,
    isOnHold: c.isOnHold,
    createdAt: c.createdAt,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminCandidatesClient
        candidates={candidateRows}
        partners={partnerOptions}
        allStatuses={allStatuses}
      />
    </div>
  );
}
