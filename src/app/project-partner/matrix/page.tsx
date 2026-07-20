import { redirect } from "next/navigation";
import Link from "next/link";
import { getEffectiveUser } from "@/lib/effective-user";
import { getStaffingForProject } from "@/lib/projects";
import { getPpmsContext, getPpmsProjects } from "@/lib/ppms-guard";
import StaffingMatrixTable from "@/components/project-partner/StaffingMatrixTable";
import MatrixPdfButton from "@/components/project-partner/MatrixPdfButton";

export const dynamic = "force-dynamic";

export default async function MatrixPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await getEffectiveUser();
  if (!user) redirect("/login");
  const ctx = await getPpmsContext();
  const projects = ctx ? await getPpmsProjects(ctx) : [];
  const { project: selectedId } = await searchParams;
  const active = projects.find((p) => p.id === selectedId) || projects[0];
  const rows = active ? await getStaffingForProject(active.id) : [];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Expert Staffing Matrix</h1>
      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No projects assigned yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/project-partner/matrix?project=${p.id}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${active?.id === p.id ? "bg-blue-600 text-white" : "border bg-card hover:bg-muted"}`}
              >
                {p.name}
              </Link>
            ))}
          </div>
          {active && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{active.client}</p>
              <MatrixPdfButton projectName={active.name} client={active.client} rows={rows} />
            </div>
          )}
          <StaffingMatrixTable rows={rows} />
        </>
      )}
    </div>
  );
}
