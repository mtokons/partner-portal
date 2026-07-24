import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getProjects } from "@/lib/projects";
import { getTorExcerpts } from "@/lib/tor-excerpts";
import { getEvaluationMatrices } from "@/lib/eval-matrices";
import CvTailorClient from "./CvTailorClient";

export const dynamic = "force-dynamic";

export default async function CvTailorPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/admin/dashboard");

  const sp = await searchParams;
  const [projects, excerpts, matrices] = await Promise.all([
    getProjects(),
    getTorExcerpts(),
    getEvaluationMatrices(),
  ]);
  const selectedProject = projects.find((p) => p.id === sp.project) || projects[0] || null;

  // Check if the Python service is reachable (server-side; shows a warning in the UI if not)
  let serviceStatus: "ok" | "unavailable" = "unavailable";
  try {
    const r = await fetch(`${process.env.CV_TAILOR_API_URL || "http://cv-tailor:8001"}/health`, { next: { revalidate: 30 } });
    if (r.ok) serviceStatus = "ok";
  } catch { /* unavailable */ }

  return (
    <div className="h-full p-0">
      <CvTailorClient
        projects={projects}
        selectedProject={selectedProject}
        serviceStatus={serviceStatus}
        torExcerpts={excerpts.map((x) => ({
          id: x.id,
          label: [x.projectName || "General", x.role || x.position].filter(Boolean).join(" — "),
          projectId: x.projectId,
          excerptText: x.excerptText || x.summary,
          bangladeshProject: x.structure?.bangladeshProject ?? false,
          sectorGroups: x.structure?.sectorGroups ?? [],
        }))}
        matrices={matrices.map((m) => ({ id: m.id, label: [m.projectName || "General", m.role].filter(Boolean).join(" — "), projectId: m.projectId, criteria: m.criteria }))}
      />
    </div>
  );
}
