import { requirePpmsManager } from "@/lib/ppms-guard";
import { getProjects, getProjectsForOrg } from "@/lib/projects";
import { getEvaluationsForProject } from "@/lib/evaluation";
import { getScoreDetailsForProject } from "@/lib/agents/score-details";
import type { EvaluationScoreDetail } from "@/lib/agents/contracts";
import ReviewClient, { type ReviewCandidate } from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function ScoringReviewPage() {
  const ctx = await requirePpmsManager();
  const orgId = ctx.org?.id || ctx.allOrgs[0]?.id || "";
  const projects = ctx.isSccgAdmin ? await getProjects() : orgId ? await getProjectsForOrg(orgId) : [];

  const candidates: ReviewCandidate[] = [];
  for (const p of projects) {
    const [details, evals] = await Promise.all([
      getScoreDetailsForProject(p.id),
      getEvaluationsForProject(p.id),
    ]);
    if (details.length === 0) continue;
    const evalMap = new Map(evals.map((e) => [e.id, e]));
    const byEval = new Map<string, EvaluationScoreDetail[]>();
    for (const d of details) {
      const arr = byEval.get(d.evaluationId) || [];
      arr.push(d);
      byEval.set(d.evaluationId, arr);
    }
    for (const [evaluationId, ds] of byEval) {
      const ev = evalMap.get(evaluationId);
      candidates.push({
        evaluationId,
        intakeId: ds[0].intakeId,
        projectId: p.id,
        projectName: p.name,
        expertName: ev?.expertName || ds[0].intakeId,
        position: ev?.position || "",
        percentage: ev?.percentage ?? 0,
        passed: ev?.passed ?? false,
        details: ds.sort((a, b) => a.category.localeCompare(b.category)),
      });
    }
  }

  // Flagged candidates first, then most recent
  candidates.sort((a, b) => {
    const fa = a.details.filter((d) => d.needsReview && !d.reviewed).length;
    const fb = b.details.filter((d) => d.needsReview && !d.reviewed).length;
    return fb - fa;
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Scoring Review</h1>
        <p className="text-sm text-muted-foreground">
          The AI judge scores each criterion conservatively and must cite evidence from the CV. Anything low-confidence or
          without verified evidence is flagged here for your sign-off before it can be published.
        </p>
      </div>
      <ReviewClient candidates={candidates} />
    </div>
  );
}
