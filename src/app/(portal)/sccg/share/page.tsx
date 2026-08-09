import { requireSccgAccess } from "@/lib/admin-guard";
import { fetchShareWizardDataAction } from "./actions";
import ShareWizardClient from "./ShareWizardClient";

export const dynamic = "force-dynamic";

export default async function CandidateSharePage() {
  await requireSccgAccess();

  const result = await fetchShareWizardDataAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Candidate Sharing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a candidate, attach their profile/CV documents, and share them with a partner.
        </p>
      </div>
      {!result.success || !result.data ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          {result.error || "Failed to load sharing data."}
        </div>
      ) : (
        <ShareWizardClient candidates={result.data.candidates} partners={result.data.partners} />
      )}
    </div>
  );
}
