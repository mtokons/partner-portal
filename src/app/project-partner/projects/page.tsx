import { redirect } from "next/navigation";
import Link from "next/link";
import { getEffectiveUser } from "@/lib/effective-user";
import { getPpmsContext, getPpmsProjects } from "@/lib/ppms-guard";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsListPage() {
  const user = await getEffectiveUser();
  if (!user) redirect("/login");
  const ctx = await getPpmsContext();
  const projects = ctx ? await getPpmsProjects(ctx) : [];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Projects</h1>
      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No projects assigned yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/project-partner/projects/${p.id}`} className="group rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{p.client}</p>
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium capitalize text-emerald-700">{p.status}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2">
                Open <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
