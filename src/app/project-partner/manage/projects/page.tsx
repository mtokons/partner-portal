import { requirePpmsManager } from "@/lib/ppms-guard";
import { getProjectsForOrg, getProjects } from "@/lib/projects";
import { getProjectOrgById } from "@/lib/project-orgs";
import ProjectsManageClient from "./ProjectsManageClient";
import OrgSwitcher from "../OrgSwitcher";

export const dynamic = "force-dynamic";

export default async function ManageProjectsPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const ctx = await requirePpmsManager();
  const sp = await searchParams;
  const activeOrgId = ctx.isSccgAdmin ? (sp.org || ctx.allOrgs[0]?.id || "") : ctx.org?.id || "";
  const activeOrg = ctx.isSccgAdmin
    ? (activeOrgId ? await getProjectOrgById(activeOrgId) : null)
    : ctx.org;

  const projects = activeOrgId
    ? await getProjectsForOrg(activeOrgId)
    : ctx.isSccgAdmin ? (await getProjects()).filter((p) => !p.orgId) : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manage Projects</h1>
          <p className="text-sm text-muted-foreground">
            {activeOrg ? activeOrg.name : "Unassigned"} · joint-venture &amp; direct projects
          </p>
        </div>
        {ctx.isSccgAdmin && <OrgSwitcher orgs={ctx.allOrgs} activeId={activeOrgId} />}
      </div>

      <ProjectsManageClient
        projects={projects}
        orgId={activeOrgId}
        orgName={activeOrg?.name || ""}
        partnerEmail={ctx.user.email}
      />
    </div>
  );
}
