import { redirect, notFound } from "next/navigation";
import { getEffectiveUser } from "@/lib/effective-user";
import { getProjectById, listProjectDocuments, canAccessProject } from "@/lib/projects";
import FolderBrowser from "@/components/project-partner/FolderBrowser";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getEffectiveUser();
  if (!user) redirect("/login");
  const isAdmin = (user.roles || [user.role]).some((r) => r.toLowerCase() === "admin");

  const project = await getProjectById(id);
  const { getOrgIdForUserEmail } = await import("@/lib/ppms-users");
  const userOrgId = await getOrgIdForUserEmail(user.email);
  if (!project || !canAccessProject(project, user.email, isAdmin, userOrgId)) notFound();

  const [cvs, proposals, documents, matrix] = await Promise.all([
    listProjectDocuments(id, "CVs"),
    listProjectDocuments(id, "Proposals"),
    listProjectDocuments(id, "Documents"),
    listProjectDocuments(id, "Matrix"),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{project.client}</p>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium capitalize text-emerald-700">{project.status}</span>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Documents</h2>
        <FolderBrowser
          projectId={id}
          folders={[
            { folder: "CVs", label: "CVs", docs: cvs },
            { folder: "Proposals", label: "Proposals", docs: proposals },
            { folder: "Documents", label: "Documents", docs: documents },
            { folder: "Matrix", label: "Matrix file", docs: matrix },
          ]}
        />
      </section>
    </div>
  );
}
