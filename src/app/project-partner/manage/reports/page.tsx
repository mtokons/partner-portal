import { requirePpmsManager, canManageOrg } from "@/lib/ppms-guard";
import { getProjectsForOrg, getProjects, getProjectById } from "@/lib/projects";
import { getDeliverablesForProject } from "@/lib/agents/deliverables";
import { activeAiProvider } from "@/lib/ai";
import ProjectPicker from "../ProjectPicker";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const ctx = await requirePpmsManager();
  const sp = await searchParams;
  const orgId = ctx.org?.id || ctx.allOrgs[0]?.id || "";
  const projects = ctx.isSccgAdmin ? await getProjects() : orgId ? await getProjectsForOrg(orgId) : [];
  const selectedId = sp.project || projects[0]?.id || "";
  const project = selectedId ? await getProjectById(selectedId) : null;
  if (project && !canManageOrg(ctx, project.orgId)) {
    return <div className="p-6 text-red-600">You cannot manage this project.</div>;
  }
  const deliverables = project ? await getDeliverablesForProject(project.id) : [];
  const provider = activeAiProvider();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Report Drafts</h1>
        <p className="text-sm text-muted-foreground">
          Draft donor deliverables (case studies, final reports) from your source material. AI ({provider}) writes
          only from what you provide and flags thin sections — every draft is for your review before submission.
        </p>
      </div>
      <ProjectPicker projects={projects} selectedId={selectedId} />
      {!project ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Select or create a project first.</p>
      ) : (
        <ReportsClient projectId={project.id} deliverables={deliverables} provider={provider} />
      )}
    </div>
  );
}
