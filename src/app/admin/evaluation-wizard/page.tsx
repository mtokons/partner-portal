import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getProjects } from "@/lib/projects";
import { getExperts } from "@/lib/expert-bank";
import { getTorExcerpts } from "@/lib/tor-excerpts";
import { getEvaluationMatrices } from "@/lib/eval-matrices";
import EvaluationWizardClient from "./EvaluationWizardClient";

export const dynamic = "force-dynamic";

export default async function EvaluationWizardPage({ searchParams }: { searchParams: Promise<{ expertId?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/admin/dashboard");

  const sp = await searchParams;

  const [projects, experts, excerpts, matrices] = await Promise.all([
    getProjects(),
    getExperts(),
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
      <EvaluationWizardClient
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        experts={experts.map((e) => ({ id: e.id, name: e.expertName, email: e.email, nationality: e.nationality, currentLocation: e.currentLocation, level: e.level, status: e.status }))}
        preSelectedExpertId={sp.expertId || ""}
        torExcerpts={excerpts.map((x) => ({ id: x.id, label: [x.projectName || "General", x.role || x.position].filter(Boolean).join(" — "), projectId: x.projectId, excerptText: x.excerptText || x.summary, bangladeshProject: x.structure?.bangladeshProject ?? false, sectorGroups: x.structure?.sectorGroups ?? [] }))}
        matrices={matrices.map((m) => ({ id: m.id, label: [m.projectName || "General", m.role].filter(Boolean).join(" — "), projectId: m.projectId, criteria: m.criteria }))}
        serviceStatus={serviceStatus}
      />
    </div>
  );
}
