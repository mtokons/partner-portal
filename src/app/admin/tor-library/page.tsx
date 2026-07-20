import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getProjects } from "@/lib/projects";
import { getTorExcerpts } from "@/lib/tor-excerpts";
import { getEvaluationMatrices } from "@/lib/eval-matrices";
import TorLibraryClient from "./TorLibraryClient";

export const dynamic = "force-dynamic";

export default async function TorLibraryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/admin/dashboard");

  const [projects, excerpts, matrices] = await Promise.all([
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
      <TorLibraryClient
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        excerpts={excerpts}
        matrices={matrices}
        serviceStatus={serviceStatus}
      />
    </div>
  );
}
