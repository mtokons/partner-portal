import { redirect } from "next/navigation";
import Link from "next/link";
import { getEffectiveUser } from "@/lib/effective-user";
import { getPpmsContext, getPpmsProjects } from "@/lib/ppms-guard";
import { EVALUATION_TEMPLATES, getEvaluationsForProject } from "@/lib/evaluation";
import { getEvaluationTemplatesForProject } from "@/lib/templates";
import { getExpertsForPartner } from "@/lib/expert-bank";
import EvaluationMatrixView from "@/components/project-partner/EvaluationMatrixView";
import ExpertEvaluationExplorer from "@/components/project-partner/ExpertEvaluationExplorer";
import ReferenceMatrixButton from "@/components/project-partner/ReferenceMatrixButton";

interface EvaluationPageContentProps {
  searchParams: Promise<{ project?: string }>;
  basePath: string;
}

export default async function EvaluationPageContent({ searchParams, basePath }: EvaluationPageContentProps) {
  const user = await getEffectiveUser();
  if (!user) redirect("/login");
  const ctx = await getPpmsContext();
  const projects = ctx ? await getPpmsProjects(ctx) : [];
  const { project: selectedId } = await searchParams;
  const active = projects.find((p) => p.id === selectedId) || projects[0];
  const partnerId = ctx?.org?.id || "";
  const visibleExperts = ctx ? await getExpertsForPartner(partnerId) : [];
  const visibleExpertNames = new Set(visibleExperts.map((e) => e.expertName.toLowerCase()));
  const evaluations = active ? await getEvaluationsForProject(active.id) : [];
  const visibleEvaluations = ctx?.isSccgAdmin
    ? evaluations
    : evaluations.filter((e) => {
        const nameMatch = visibleExpertNames.has(e.expertName.toLowerCase());
        if (nameMatch) return true;
        return !visibleExperts.some((expert) => expert.expertName.toLowerCase() === e.expertName.toLowerCase());
      });
  const canBook = !!ctx && (ctx.isSccgAdmin || ctx.isOrgAdmin || ctx.isViewer);

  // Merge the canonical (TVET4RE) templates with any per-project custom templates
  // so the matrix can render criteria for both legacy and PPMS evaluations.
  const customTemplates = active ? await getEvaluationTemplatesForProject(active.id) : [];
  const templates: Record<string, { name: string; minPercent: number; criteria: typeof EVALUATION_TEMPLATES["expert-2"]["criteria"] }> = { ...EVALUATION_TEMPLATES };
  for (const t of customTemplates) templates[t.evalKey] = { name: t.name, minPercent: t.minPercent, criteria: t.criteria };

  const passed = visibleEvaluations.filter((e) => e.passed).length;
  const avg = visibleEvaluations.length ? Math.round((visibleEvaluations.reduce((s, e) => s + e.percentage, 0) / visibleEvaluations.length) * 10) / 10 : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Evaluation Matrix</h1>
          <p className="text-sm text-muted-foreground">Every expert CV is scored against this project&apos;s official evaluation criteria so partners can see why each candidate is proposed.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ctx?.isSccgAdmin
              ? "Admins can review the full expert evaluation set, including best-fit role insights for every candidate."
              : "Your view is limited to experts assigned to your organisation, with the best-fit role highlighted for each evaluation."}
          </p>
        </div>
        <ReferenceMatrixButton templates={EVALUATION_TEMPLATES} />
      </div>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No projects assigned yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`${basePath}?project=${p.id}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${active?.id === p.id ? "bg-blue-600 text-white" : "border bg-card hover:bg-muted"}`}
              >
                {p.name}
              </Link>
            ))}
          </div>

          {active && visibleEvaluations.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="Experts evaluated" value={String(visibleEvaluations.length)} />
              <Kpi label="Meeting minimum" value={`${passed} / ${visibleEvaluations.length}`} accent="text-emerald-600" />
              <Kpi label="Average score" value={`${avg}%`} />
              <Kpi label="Evaluation pools" value={String(new Set(visibleEvaluations.map((e) => e.evalType)).size)} />
            </div>
          )}

          <ExpertEvaluationExplorer
            projectId={active?.id || ""}
            projectName={active?.name || ""}
            evaluations={visibleEvaluations}
            templates={templates}
            canBook={canBook}
            isAdmin={ctx?.isSccgAdmin || false}
          />
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${accent || ""}`}>{value}</p>
    </div>
  );
}
