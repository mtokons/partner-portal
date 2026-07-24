import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getExperts } from "@/lib/expert-bank";
import { getProjects } from "@/lib/projects";
import { getTorExcerpts } from "@/lib/tor-excerpts";
import { getEvaluationMatrices } from "@/lib/eval-matrices";
import CvWizardClient from "./CvWizardClient";

export const dynamic = "force-dynamic";

export default async function CvWizardPage({ searchParams }: { searchParams: Promise<{ expertId?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/admin/dashboard");

  const sp = await searchParams;

  const [experts, projects, excerpts, matrices] = await Promise.all([
    getExperts(),
    getProjects(),
    getTorExcerpts(),
    getEvaluationMatrices(),
  ]);

  let serviceStatus: "ok" | "unavailable" = "unavailable";
  try {
    const r = await fetch(`${process.env.CV_TAILOR_API_URL || "http://cv-tailor:8001"}/health`, { next: { revalidate: 30 } });
    if (r.ok) serviceStatus = "ok";
  } catch { /* unavailable */ }

  return (
    <div className="h-full p-0">
      <CvWizardClient
        experts={experts.map((e) => ({ id: e.id, name: e.expertName, email: e.email, nationality: e.nationality, currentLocation: e.currentLocation, level: e.level }))}
        preSelectedExpertId={sp.expertId || ""}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        torExcerpts={excerpts.map((x) => ({ id: x.id, label: [x.projectName || "General", x.role || x.position].filter(Boolean).join(" — "), projectId: x.projectId, excerptText: x.excerptText || x.summary, bangladeshProject: x.structure?.bangladeshProject ?? false, sectorGroups: x.structure?.sectorGroups ?? [] }))}
        matrices={matrices.map((m) => ({ id: m.id, label: [m.projectName || "General", m.role].filter(Boolean).join(" — "), projectId: m.projectId, criteria: m.criteria }))}
        serviceStatus={serviceStatus}
      />
    </div>
  );
}
