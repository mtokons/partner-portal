import { requirePpmsManager, canManageOrg } from "@/lib/ppms-guard";
import { getProjectsForOrg, getProjects, getProjectById } from "@/lib/projects";
import { getTorDocsForProject } from "@/lib/agents/tor-docs";
import { activeAiProvider } from "@/lib/ai";
import ProjectPicker from "../ProjectPicker";
import TorClient from "./TorClient";

export const dynamic = "force-dynamic";

export default async function TorAnalyzerPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const ctx = await requirePpmsManager();
  const sp = await searchParams;
  const orgId = ctx.org?.id || ctx.allOrgs[0]?.id || "";
  const projects = ctx.isSccgAdmin ? await getProjects() : orgId ? await getProjectsForOrg(orgId) : [];
  const selectedId = sp.project || projects[0]?.id || "";
  const project = selectedId ? await getProjectById(selectedId) : null;
  if (project && !canManageOrg(ctx, project.orgId)) {
    return <div className="p-6 text-red-600">You cannot manage this project.</div>;
  }
  const docs = project ? await getTorDocsForProject(project.id) : [];
  const provider = activeAiProvider();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">ToR Analyzer</h1>
        <p className="text-sm text-muted-foreground">
          Upload a donor Terms of Reference — AI ({provider}) extracts the expert roles and qualifications,
          then you approve it to auto-build the project&apos;s CV form and evaluation matrix.
        </p>
      </div>
      <ProjectPicker projects={projects} selectedId={selectedId} />
      {!project ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Select or create a project first.</p>
      ) : (
        <TorClient projectId={project.id} docs={docs} provider={provider} />
      )}
    </div>
  );
}
