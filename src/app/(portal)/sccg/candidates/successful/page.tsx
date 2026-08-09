import { requireSccgAccess } from "@/lib/admin-guard";
import { getCandidates, getPartners, getSuccessStories } from "@/lib/sharepoint";
import type { WorkflowCategory, CandidateStatus } from "@/types";
import SuccessfulCandidatesClient from "./SuccessfulCandidatesClient";

export const dynamic = "force-dynamic";

/** Terminal (successful) status per workflow category. */
const SUCCESS_STATUS: Record<WorkflowCategory, CandidateStatus> = {
  "Training & Language": "TRAINING_FINISHED",
  Ausbildung: "COMPLETED",
  Student: "COMPLETED",
  "Opportunity Card": "COMPLETED",
  Others: "COMPLETED",
};

export default async function SuccessfulCandidatesPage() {
  await requireSccgAccess();

  const [candidates, partners] = await Promise.all([getCandidates(), getPartners()]);
  const partnerNameById = new Map(partners.map((p) => [p.id, p.name]));
  const stories = await getSuccessStories();

  const successfulCandidates = candidates
    .filter((c) => c.currentStatus === SUCCESS_STATUS[c.workflowCategory])
    .map((c) => ({ ...c, partnerName: c.partnerName || partnerNameById.get(c.partnerId) || "—" }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Successful Candidate Gallery</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Candidates who have completed their program, grouped by category.
        </p>
      </div>
      <SuccessfulCandidatesClient
        candidates={successfulCandidates}
        partners={partners.map((p) => ({ id: p.id, name: p.name }))}
        initialStories={stories}
      />
    </div>
  );
}
