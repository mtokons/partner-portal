import { requirePpmsManager, canManageOrg } from "@/lib/ppms-guard";
import { getProjectsForOrg, getProjectById } from "@/lib/projects";
import { getCvFormTemplateById, getEvaluationTemplateById } from "@/lib/templates";
import { getIntakesForProject } from "@/lib/cv-intake";
import { activeAiProvider } from "@/lib/ai";
import IntakeClient from "./IntakeClient";
import ProjectPicker from "../ProjectPicker";

export const dynamic = "force-dynamic";

export default async function ManageIntakePage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const ctx = await requirePpmsManager();
  const sp = await searchParams;

  const orgId = ctx.org?.id || ctx.allOrgs[0]?.id || "";
  const projects = orgId ? await getProjectsForOrg(orgId) : [];
  const selectedId = sp.project || projects[0]?.id || "";
  const project = selectedId ? await getProjectById(selectedId) : null;
  if (project && !canManageOrg(ctx, project.orgId)) {
    return <div className="p-6 text-red-600">You cannot manage this project.</div>;
  }

  const cvForm = project?.cvFormTemplateId ? await getCvFormTemplateById(project.cvFormTemplateId) : null;
  const evalTemplate = project?.evaluationTemplateId ? await getEvaluationTemplateById(project.evaluationTemplateId) : null;
  const intakes = project ? await getIntakesForProject(project.id) : [];
  const provider = activeAiProvider();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">AI CV Intake</h1>
        <p className="text-sm text-muted-foreground">
          Upload an expert CV — AI ({provider}) extracts the project-targeted form, then scores it against the evaluation matrix.
        </p>
      </div>

      <ProjectPicker projects={projects} selectedId={selectedId} />

      {!project ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Select or create a project first.</p>
      ) : (
        <IntakeClient
          project={project}
          cvForm={cvForm}
          hasEvalTemplate={!!evalTemplate}
          intakes={intakes}
          provider={provider}
        />
      )}
    </div>
  );
}
