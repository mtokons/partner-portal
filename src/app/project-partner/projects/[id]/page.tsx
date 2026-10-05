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

  const isInactive = project.status === "inactive";
  // Inactive projects are strictly read-only; file downloads and copying are disabled
  const readOnly = isInactive;

  const [cvs, proposals, documents, matrix] = await Promise.all([
    listProjectDocuments(id, "CVs"),
    listProjectDocuments(id, "Proposals"),
    listProjectDocuments(id, "Documents"),
    listProjectDocuments(id, "Matrix"),
  ]);

  return (
    <div className="space-y-6 p-6">
      {/* ── Inactive banner ── */}
      {readOnly && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          <span className="mt-0.5 text-lg">🔒</span>
          <div>
            <p className="font-semibold text-sm">This project is currently inactive</p>
            <p className="text-xs mt-0.5 text-amber-700">
              You are viewing this project in read-only mode. Downloading files and copying content are restricted.
              Contact SCCG if you have questions.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{project.client}</p>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
            project.status === "inactive"
              ? "bg-slate-100 text-slate-500"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {project.status === "inactive" ? "🔒 Inactive" : project.status}
        </span>
      </div>

      <section className={readOnly ? "select-none pointer-events-none-downloads" : ""}>
        <h2 className="mb-3 text-lg font-semibold">Documents</h2>

        {/* When read-only, wrap in a container that blocks user-select and hides download links via CSS */}
        {readOnly ? (
          <div
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
            className="relative"
          >
            {/* Transparent overlay to block right-click save-as on the whole section */}
            <FolderBrowser
              projectId={id}
              folders={[
                { folder: "CVs", label: "CVs", docs: cvs },
                { folder: "Proposals", label: "Proposals", docs: proposals },
                { folder: "Documents", label: "Documents", docs: documents },
                { folder: "Matrix", label: "Matrix file", docs: matrix },
              ]}
              readOnly={readOnly}
            />
          </div>
        ) : (
          <FolderBrowser
            projectId={id}
            folders={[
              { folder: "CVs", label: "CVs", docs: cvs },
              { folder: "Proposals", label: "Proposals", docs: proposals },
              { folder: "Documents", label: "Documents", docs: documents },
              { folder: "Matrix", label: "Matrix file", docs: matrix },
            ]}
            readOnly={false}
          />
        )}
      </section>
    </div>
  );
}
