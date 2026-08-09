import { redirect } from "next/navigation";
import Link from "next/link";
import { getEffectiveUser } from "@/lib/effective-user";
import { getStaffingForProject, listProjectDocuments } from "@/lib/projects";
import { getPpmsContext, getPpmsProjects } from "@/lib/ppms-guard";
import { FolderKanban, Users, Activity, ArrowRight, FileText, Layers, PauseCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectPartnerDashboard() {
  const user = await getEffectiveUser();
  if (!user) redirect("/login");
  const ctx = await getPpmsContext();
  const projects = ctx ? await getPpmsProjects(ctx) : [];

  const staffingCounts = await Promise.all(projects.map((p) => getStaffingForProject(p.id)));
  const cvCounts = await Promise.all(projects.map((p) => listProjectDocuments(p.id, "CVs")));
  const allExperts = staffingCounts.flat();
  const totalExperts = allExperts.length;
  const activeExperts = allExperts.filter((e) => e.activeStatus === "active").length;
  const standbyExperts = allExperts.filter((e) => e.activeStatus === "standby").length;
  const unavailableExperts = allExperts.filter((e) => e.activeStatus === "unavailable").length;
  const totalCvs = cvCounts.reduce((s, arr) => s + arr.filter((d) => !d.isFolder).length, 0);

  // Work package distribution from notes prefix ("WPx: ...")
  const wpMap = new Map<string, number>();
  for (const e of allExperts) {
    const wp = (e.notes || "").split("·")[0].trim().split(":")[0].trim() || "Other";
    wpMap.set(wp, (wpMap.get(wp) || 0) + 1);
  }
  const workPackages = [...wpMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const wpColors = ["bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-pink-500", "bg-teal-500", "bg-indigo-500"];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="text-muted-foreground">
          Your shared projects and expert staffing at a glance.
          {["integration@mysccg.de", "gopa@mysccg.de", "icon@mysccg.de"].includes(user.email?.toLowerCase() || "") && (
            <span className="block mt-1 text-sm text-indigo-500 font-semibold">
              SCCG here technical Smart solution procived of Edukraft.
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard icon={<FolderKanban className="h-5 w-5" />} label="Projects" value={projects.length} className="gradient-blue" href="/project-partner/projects" />
        <KpiCard icon={<Users className="h-5 w-5" />} label="Mapped Experts" value={totalExperts} className="gradient-purple" href="/project-partner/experts" />
        <KpiCard icon={<Activity className="h-5 w-5" />} label="Active Experts" value={activeExperts} className="gradient-green" href="/project-partner/experts" />
        <KpiCard icon={<PauseCircle className="h-5 w-5" />} label="On Standby" value={standbyExperts} className="gradient-orange" href="/project-partner/experts" />
        <KpiCard icon={<FileText className="h-5 w-5" />} label="CVs Available" value={totalCvs} className="gradient-blue" href="/project-partner/projects" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-emerald-600" /> Expert Availability</h2>
          <StatusBar label="Active" value={activeExperts} total={totalExperts} color="bg-emerald-500" />
          <StatusBar label="Standby" value={standbyExperts} total={totalExperts} color="bg-amber-500" />
          <StatusBar label="Unavailable" value={unavailableExperts} total={totalExperts} color="bg-gray-400" />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Layers className="h-4 w-4 text-indigo-600" /> Experts by Work Package</h2>
          {workPackages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staffing data yet.</p>
          ) : (
            workPackages.map(([wp, n], i) => (
              <StatusBar key={wp} label={wp} value={n} total={totalExperts} color={wpColors[i % wpColors.length]} />
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Projects</h2>
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
                  View project <ArrowRight className="h-4 w-4 transition-all" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, className, href }: { icon: React.ReactNode; label: string; value: number; className: string; href?: string }) {
  const content = (
    <div className={`group rounded-xl p-5 text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm/none opacity-90 group-hover:opacity-100 flex items-center gap-1">
          {label}
          {href && <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 transform -translate-x-1 group-hover:translate-x-0" />}
        </span>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
  return href ? <Link href={href} className="block focus:outline-none">{content}</Link> : content;
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value} · {pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
