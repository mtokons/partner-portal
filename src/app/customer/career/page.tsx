import { fetchMyCareerProfile } from "./actions";
import CareerSurveyClient from "./client";
import type { CareerSuggestion } from "@/lib/ai-career";

export default async function CareerPage() {
  const existing = await fetchMyCareerProfile().catch(() => null);
  let suggestions: CareerSuggestion[] = [];
  if (existing?.suggestions) {
    try {
      suggestions = JSON.parse(existing.suggestions);
    } catch {
      suggestions = [];
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Career Suggestions</h1>
        <p className="text-sm text-muted-foreground">
          Tell us about yourself and we&apos;ll recommend relevant SCCG programs.
        </p>
      </div>
      <CareerSurveyClient
        initial={
          existing
            ? {
                currentRole: existing.currentRole,
                yearsExperience: existing.yearsExperience,
                education: existing.education,
                skills: existing.skills,
                goals: existing.goals,
                industry: existing.industry,
              }
            : null
        }
        initialSuggestions={suggestions}
        initialProfileSummary={existing?.profile ?? null}
      />
    </div>
  );
}
