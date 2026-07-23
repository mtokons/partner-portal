import { getAllCandidatesAction } from "../actions";
import { CvBuilderStudio } from "@/components/cv-suite/builder/CvBuilderStudio";

export default async function CvSuiteCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ candidate?: string; candidateId?: string; blank?: string }>;
}) {
  const { candidate, candidateId, blank } = await searchParams;
  const candidates = await getAllCandidatesAction();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-foreground">Create Candidate CV</h2>
        <p className="text-xs text-muted-foreground">
          Auto-populated candidate CV builder & PDF exporter.
        </p>
      </div>

      <CvBuilderStudio
        candidates={candidates}
        initialCandidateQuery={candidate}
        initialCandidateId={candidateId}
        initialBlank={blank === "true"}
      />
    </div>
  );
}
