import Link from "next/link";
import {
  Users,
  ArrowUpRight,
  Download,
  FolderOpen,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { getCvSuiteStats } from "./actions";
import { StatsCards } from "@/components/cv-suite/StatsCards";
import { formatStatusLabel } from "@/lib/engine/candidate-workflow";

export const dynamic = "force-dynamic";

const CATEGORY_BADGES: Record<string, string> = {
  Training: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Ausbildung: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "Student Visa": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Opportunity Card": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default async function CvSuiteDashboardPage() {
  const stats = await getCvSuiteStats();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <StatsCards
        stats={[
          {
            label: "Total Candidates",
            value: stats.totalCandidates,
            iconName: "users",
            color: "blue",
            trend: "up",
            trendValue: "Active pipeline",
          },
          {
            label: "Total Revenue",
            value: `€${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
            iconName: "dollar",
            color: "emerald",
            trend: "up",
            trendValue: `Avg €${stats.avgServiceFee}`,
          },
          {
            label: "On Hold",
            value: stats.onHold,
            iconName: "pause",
            color: stats.onHold > 0 ? "amber" : "emerald",
            trend: stats.onHold > 0 ? "down" : "neutral",
            trendValue: stats.onHold > 0 ? "Needs attention" : "All clear",
          },
          {
            label: "Pending Payment",
            value: stats.byPayment["pending"] ?? 0,
            iconName: "alert",
            color: (stats.byPayment["pending"] ?? 0) > 0 ? "rose" : "emerald",
            trend: (stats.byPayment["pending"] ?? 0) > 0 ? "down" : "neutral",
            trendValue: `${stats.byPayment["fully-paid"] ?? 0} fully paid`,
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-card rounded-2xl border p-6 space-y-4 lg:col-span-1">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            By Category
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => {
                const pct = stats.totalCandidates
                  ? Math.round((count / stats.totalCandidates) * 100)
                  : 0;
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          CATEGORY_BADGES[cat] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {cat}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Recent Candidates */}
        <div className="bg-card rounded-2xl border overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Recent Candidates
            </h2>
            <Link
              href="/admin/cv-suite/candidates"
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              View all
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y">
            {stats.recentCandidates.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/admin/cv-suite/candidates/${c.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {c.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {c.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.sccgId} · {formatStatusLabel(c.currentStatus as string)}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ${
                    CATEGORY_BADGES[c.workflowCategory] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.workflowCategory}
                </span>
                <span className="text-sm font-medium text-foreground tabular-nums shrink-0">
                  €{c.totalServiceFee.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/cv-suite/candidates"
          className="group flex items-center gap-4 p-5 bg-card rounded-2xl border hover:border-primary/30 hover:shadow-md transition-all duration-300"
        >
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Candidates</p>
            <p className="text-xs text-muted-foreground">Search & filter candidate database</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/admin/cv-suite/builder"
          className="group flex items-center gap-4 p-5 bg-card rounded-2xl border hover:border-primary/30 hover:shadow-md transition-all duration-300"
        >
          <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">CV Builder Studio</p>
            <p className="text-xs text-muted-foreground">Live editor with PDF & Word export</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/admin/cv-suite/templates"
          className="group flex items-center gap-4 p-5 bg-card rounded-2xl border hover:border-primary/30 hover:shadow-md transition-all duration-300"
        >
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Template Gallery</p>
            <p className="text-xs text-muted-foreground">Berlin, Zurich, Munich & Vienna</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/admin/cv-suite/export"
          className="group flex items-center gap-4 p-5 bg-card rounded-2xl border hover:border-primary/30 hover:shadow-md transition-all duration-300"
        >
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Export Center</p>
            <p className="text-xs text-muted-foreground">Bulk PDF, CSV & JSON data exports</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
        </Link>
      </div>
    </div>
  );
}
