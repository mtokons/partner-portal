import { requireAdmin } from "@/lib/admin-guard";
import { getProjects } from "@/lib/projects";
import { getProjectOrgs } from "@/lib/project-orgs";
import ProjectsAdminClient from "./ProjectsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  await requireAdmin();
  const [projects, orgs] = await Promise.all([
    getProjects(),
    getProjectOrgs(),
  ]);
  return (
    <ProjectsAdminClient
      initial={projects}
      orgs={orgs.map((o) => ({ id: o.id, name: o.name, emails: o.adminEmails }))}
    />
  );
}
