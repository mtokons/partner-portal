import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import { getCustomerPackages } from "@/lib/sharepoint";
import type { SessionUser } from "@/types";
import Link from "next/link";
import { UserSquare, Package, ChevronRight, Users } from "lucide-react";

export const metadata = {
  title: "My Candidates | Expert Portal",
  description: "View all candidates assigned to you and their SCCG packages.",
};

export default async function ExpertCandidatesPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/expert-login");
  const user = session.user as SessionUser;

  const allPackages = await getCustomerPackages(undefined, undefined, user.id);
  const myPackages = allPackages.filter((p) => p.expertId === user.id);

  // Group packages by candidate
  const candidateMap = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      packages: typeof myPackages;
      completedSessions: number;
      totalSessions: number;
    }
  >();

  for (const pkg of myPackages) {
    const existing = candidateMap.get(pkg.customerId);
    if (existing) {
      existing.packages.push(pkg);
      existing.totalSessions += pkg.totalSessions;
      existing.completedSessions += pkg.completedSessions;
    } else {
      candidateMap.set(pkg.customerId, {
        customerId: pkg.customerId,
        customerName: pkg.customerName || pkg.customerId,
        packages: [pkg],
        totalSessions: pkg.totalSessions,
        completedSessions: pkg.completedSessions,
      });
    }
  }

  const candidates = Array.from(candidateMap.values());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserSquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Candidates</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} assigned to you
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 text-xs font-semibold text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {myPackages.length} active package{myPackages.length !== 1 ? "s" : ""}
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <UserSquare className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No candidates yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            You have no candidates assigned to you yet. Contact your SCCG administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((candidate) => {
            const overallPct =
              candidate.totalSessions > 0
                ? Math.round((candidate.completedSessions / candidate.totalSessions) * 100)
                : 0;

            const activePackages = candidate.packages.filter((p) => p.status === "active");
            const completedPackages = candidate.packages.filter((p) => p.status === "completed");

            return (
              <Link
                key={candidate.customerId}
                href={`/expert/candidates/${candidate.customerId}`}
                className="group relative flex flex-col rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                {/* Top accent bar */}
                <div className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 group-hover:from-primary group-hover:to-primary transition-all" />

                <div className="p-5 flex-1 space-y-4">
                  {/* Candidate name + arrow */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                        {candidate.customerName.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-base leading-tight">
                          {candidate.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {candidate.packages.length} package{candidate.packages.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  </div>

                  {/* Package badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.packages.map((pkg) => (
                      <span
                        key={pkg.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          pkg.status === "active"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : pkg.status === "completed"
                            ? "bg-muted/60 text-muted-foreground border-border"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        <Package className="h-2.5 w-2.5" />
                        {pkg.packageName}
                      </span>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Session progress</span>
                      <span className="font-bold text-foreground">
                        {candidate.completedSessions}/{candidate.totalSessions}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${overallPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{overallPct}% complete</span>
                      {completedPackages.length > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {completedPackages.length} completed
                        </span>
                      )}
                      {activePackages.length > 0 && (
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {activePackages.length} active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
