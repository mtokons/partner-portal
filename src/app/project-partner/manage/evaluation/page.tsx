import { requirePpmsManager, canManageOrg } from "@/lib/ppms-guard";
import { getProjectsForOrg, getProjectById } from "@/lib/projects";
import { getCvFormTemplatesForProject, getEvaluationTemplatesForProject } from "@/lib/templates";
import EvalSetupClient from "./EvalSetupClient";
import ProjectPicker from "../ProjectPicker";

export const dynamic = "force-dynamic";

export default async function ManageEvaluationPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const ctx = await requirePpmsManager();
  const sp = await searchParams;

  const orgId = ctx.org?.id || ctx.allOrgs[0]?.id || "";
  const projects = orgId ? await getProjectsForOrg(orgId) : [];

  const selectedId = sp.project || projects[0]?.id || "";
  const project = selectedId ? await getProjectById(selectedId) : null;
  if (project && !canManageOrg(ctx, project.orgId)) {
    return <div className="p-6 text-red-600">You cannot manage this project.</div>;
  }

  const cvForms = project ? await getCvFormTemplatesForProject(project.id) : [];
  const evalTemplates = project ? await getEvaluationTemplatesForProject(project.id) : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Evaluation &amp; CV Form Setup</h1>
        <p className="text-sm text-muted-foreground">Define the targeted CV form and scoring matrix the AI uses for each project.</p>
      </div>

      <ProjectPicker projects={projects} selectedId={selectedId} />

      {!project ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Select or create a project first.</p>
      ) : (
        <EvalSetupClient
          project={project}
          cvForm={cvForms[0] || null}
          evalTemplate={evalTemplates[0] || null}
        />
      )}
    </div>
  );
}
