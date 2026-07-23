import { getAllCandidatesAction } from "../actions";
import { CvBuilderStudio } from "@/components/cv-suite/builder/CvBuilderStudio";

export default async function CvBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ candidate?: string; candidateId?: string; blank?: string }>;
}) {
  const { candidate, candidateId, blank } = await searchParams;
  const candidates = await getAllCandidatesAction();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-foreground">CV Builder & Resume Studio</h2>
        <p className="text-xs text-muted-foreground">
          Create, customize, and export high-impact CVs in PDF and Microsoft Word (.docx) formats.
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
