import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser, WorkflowCategory } from "@/types";
import { getPartnerByEmail, getCandidates, getTransactions } from "@/lib/sharepoint";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  Target, TrendingUp, Trophy, BarChart3, CheckCircle2, AlertTriangle,
  ArrowUpRight, Calendar, Zap
} from "lucide-react";

export default async function TargetAchievementPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const candidates = await getCandidates(partner.id);
  const margin = partner.marginPercentage || 15;
  const salesTarget = partner.salesTarget || 0;
  const now = new Date();
  const currentYear = now.getFullYear();

  // === YEARLY TOTALS ===
  const yearCandidates = candidates.filter((c) => c.createdAt?.startsWith(String(currentYear)));
  const yearSales = yearCandidates.reduce((s, c) => s + (c.totalServiceFee || 0), 0);
  const yearCommission = yearCandidates.reduce((s, c) => s + (c.partnerShare || 0), 0);
  const yearClients = yearCandidates.length;

  const targetProgress = salesTarget > 0 ? Math.min(100, (yearSales / salesTarget) * 100) : 0;
  const remaining = Math.max(0, salesTarget - yearSales);
  const monthsLeft = 12 - now.getMonth();
  const monthlyNeeded = monthsLeft > 0 && remaining > 0 ? remaining / monthsLeft : 0;

  // === MONTHLY BREAKDOWN ===
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(currentYear, i, 1);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const mc = candidates.filter((c) =>
      c.createdAt && isWithinInterval(parseISO(c.createdAt), { start, end })
    );
    return {
      month: i,
      label: format(d, "MMM"),
      fullLabel: format(d, "MMMM"),
      sales: mc.reduce((s, c) => s + (c.totalServiceFee || 0), 0),
      commission: mc.reduce((s, c) => s + (c.partnerShare || 0), 0),
      clients: mc.length,
      isPast: i < now.getMonth(),
      isCurrent: i === now.getMonth(),
    };
  });

  const maxMonthlySales = Math.max(...monthlyData.map((m) => m.sales), 1);
  const monthlyTarget = salesTarget > 0 ? salesTarget / 12 : 0;

  // === CATEGORY PERFORMANCE ===
  const categories: WorkflowCategory[] = ["Training", "Ausbildung", "Student Visa", "Opportunity Card"];
  const categoryPerformance = categories.map((cat) => {
    const cs = yearCandidates.filter((c) => c.workflowCategory === cat);
    return {
      category: cat,
      clients: cs.length,
      sales: cs.reduce((s, c) => s + (c.totalServiceFee || 0), 0),
      commission: cs.reduce((s, c) => s + (c.partnerShare || 0), 0),
    };
  }).filter((r) => r.clients > 0).sort((a, b) => b.sales - a.sales);

  // === MILESTONES ===
  const milestones = [
    { pct: 25, label: "25% — On Track", color: "text-blue-500", bg: "bg-blue-500" },
    { pct: 50, label: "50% — Halfway", color: "text-amber-500", bg: "bg-amber-500" },
    { pct: 75, label: "75% — Almost There", color: "text-purple-500", bg: "bg-purple-500" },
    { pct: 100, label: "100% — Target Met!", color: "text-emerald-500", bg: "bg-emerald-500" },
  ];

  // Previous year comparison
  const prevYearCandidates = candidates.filter((c) => c.createdAt?.startsWith(String(currentYear - 1)));
  const prevYearSales = prevYearCandidates.reduce((s, c) => s + (c.totalServiceFee || 0), 0);
  const yoyGrowth = prevYearSales > 0 ? ((yearSales - prevYearSales) / prevYearSales * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          Target vs Achievement
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {currentYear} Sales Target · Set by Admin · Track your progress and milestones
        </p>
      </div>

      {/* Main Target Card */}
      {salesTarget > 0 ? (
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              {targetProgress >= 100 ? (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <Trophy className="w-8 h-8 text-emerald-500" />
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                  <Target className="w-8 h-8 text-primary" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-extrabold text-foreground">Annual Sales Target</h2>
                <p className="text-sm text-muted-foreground">
                  {targetProgress >= 100 ? "Target achieved! Bonus eligible" : `${remaining > 0 ? `€${remaining.toLocaleString("en")} remaining` : "On track"}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-foreground">
                €{yearSales.toLocaleString("en")}
                <span className="text-lg text-muted-foreground font-medium"> / €{salesTarget.toLocaleString("en")}</span>
              </p>
              <p className={`text-sm font-bold ${targetProgress >= 100 ? "text-emerald-500" : targetProgress >= 75 ? "text-blue-500" : targetProgress >= 50 ? "text-amber-500" : "text-rose-500"}`}>
                {targetProgress.toFixed(1)}% achieved
              </p>
            </div>
          </div>

          {/* Progress Bar with Milestones */}
          <div className="relative">
            <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${targetProgress >= 100 ? "bg-gradient-to-r from-emerald-500 to-green-400" : targetProgress >= 75 ? "bg-gradient-to-r from-blue-500 to-cyan-400" : targetProgress >= 50 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-rose-500 to-orange-400"}`}
                style={{ width: `${targetProgress}%` }}
              />
            </div>
            {/* Milestone markers */}
            <div className="absolute top-0 left-0 w-full h-6 flex items-center pointer-events-none">
              {milestones.map((m) => (
                <div key={m.pct} className="absolute" style={{ left: `${m.pct}%` }}>
                  <div className={`w-0.5 h-6 ${targetProgress >= m.pct ? m.bg : "bg-muted-foreground/20"}`} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-2">
            {milestones.map((m) => (
              <span key={m.pct} className={`text-[9px] font-bold ${targetProgress >= m.pct ? m.color : "text-muted-foreground/40"}`}>
                {m.pct === 100 ? "🎯 100%" : `${m.pct}%`}
              </span>
            ))}
          </div>

          {/* Action Items */}
          {targetProgress < 100 && monthlyNeeded > 0 && (
            <div className="mt-4 bg-card/50 rounded-xl p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-bold text-foreground">To Hit Your Target</p>
              </div>
              <p className="text-xs text-muted-foreground">
                You need <span className="font-bold text-foreground">€{monthlyNeeded.toLocaleString("en", { maximumFractionDigits: 0 })}</span> in sales per month
                for the remaining <span className="font-bold text-foreground">{monthsLeft}</span> month(s).
                That's roughly <span className="font-bold text-foreground">{monthlyTarget > 0 ? Math.ceil(monthlyNeeded / (monthlyTarget / (yearClients / Math.max(now.getMonth() + 1, 1) || 1))) : "—"}</span> new client(s) per month at your average sale value.
              </p>
            </div>
          )}

          {targetProgress >= 100 && (
            <div className="mt-4 bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-500" />
                <p className="text-sm font-bold text-emerald-500">
                  Congratulations! You've achieved your {currentYear} sales target. Additional sales bonus applies!
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border-2 border-dashed border-border rounded-2xl p-8 text-center">
          <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <h2 className="text-lg font-bold text-foreground">No Sales Target Set</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your admin has not set a sales target for {currentYear} yet. Contact your admin to set one.
          </p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-card border rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Year Sales</p>
          <p className="text-lg font-extrabold text-foreground mt-1">€{yearSales.toLocaleString("en")}</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Commission Earned</p>
          <p className="text-lg font-extrabold text-emerald-500 mt-1">€{yearCommission.toLocaleString("en")}</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Clients This Year</p>
          <p className="text-lg font-extrabold text-blue-500 mt-1">{yearClients}</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Avg per Sale</p>
          <p className="text-lg font-extrabold text-purple-500 mt-1">€{yearClients > 0 ? (yearSales / yearClients).toFixed(0) : 0}</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">YoY Growth</p>
          <p className={`text-lg font-extrabold mt-1 ${yoyGrowth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {yoyGrowth >= 0 ? "+" : ""}{yoyGrowth.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Monthly Progress Chart */}
      <div className="bg-card border rounded-2xl p-5">
        <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Monthly Progress — {currentYear}
        </h3>
        <div className="flex items-end gap-2 h-48">
          {monthlyData.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
              {m.sales > 0 && (
                <p className="text-[8px] font-bold text-foreground">€{(m.sales / 1000).toFixed(1)}k</p>
              )}
              <div className="w-full relative">
                <div
                  className={`w-full rounded-lg transition-all ${m.isCurrent ? "bg-primary/80 ring-2 ring-primary/30" : m.isPast ? (m.sales >= monthlyTarget && salesTarget > 0 ? "bg-emerald-500/70" : "bg-blue-500/50") : "bg-muted/40"}`}
                  style={{ height: `${Math.max(4, (m.sales / maxMonthlySales) * 140)}px` }}
                  title={`${m.fullLabel}: €${m.sales.toLocaleString("en")} · ${m.clients} clients`}
                />
                {/* Monthly target line */}
                {salesTarget > 0 && monthlyTarget > 0 && (
                  <div
                    className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500/50"
                    style={{ bottom: `${Math.max(0, (monthlyTarget / maxMonthlySales) * 140)}px` }}
                  />
                )}
              </div>
              <p className={`text-[9px] font-medium ${m.isCurrent ? "text-primary font-bold" : "text-muted-foreground"}`}>{m.label}</p>
              <p className="text-[8px] text-muted-foreground">{m.clients}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500/50" /> Past Month</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-primary/80" /> Current</span>
          {salesTarget > 0 && <span className="flex items-center gap-1"><span className="w-6 border-t-2 border-dashed border-amber-500/50" /> Monthly Target</span>}
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500/70" /> Above Target</span>
        </div>
      </div>

      {/* Performance by Category */}
      {categoryPerformance.length > 0 && (
        <div className="bg-card border rounded-2xl p-5">
          <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Performance by Service
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categoryPerformance.map((cat, idx) => {
              const pct = yearSales > 0 ? (cat.sales / yearSales * 100).toFixed(0) : "0";
              const colors = [
                "border-blue-500/20 bg-blue-500/5",
                "border-emerald-500/20 bg-emerald-500/5",
                "border-purple-500/20 bg-purple-500/5",
                "border-amber-500/20 bg-amber-500/5",
              ];
              return (
                <div key={cat.category} className={`border rounded-xl p-4 ${colors[idx % colors.length]}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-foreground">{cat.category}</span>
                    <span className="text-xs text-muted-foreground">{pct}% of total</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-extrabold text-foreground">{cat.clients}</p>
                      <p className="text-[9px] text-muted-foreground">Clients</p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-blue-500">€{(cat.sales / 1000).toFixed(1)}k</p>
                      <p className="text-[9px] text-muted-foreground">Sales</p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-emerald-500">€{(cat.commission / 1000).toFixed(1)}k</p>
                      <p className="text-[9px] text-muted-foreground">Commission</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cumulative Progress */}
      <div className="bg-card border rounded-2xl p-5">
        <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Cumulative Sales Progress
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                <th className="px-4 py-3 text-left">Month</th>
                <th className="px-4 py-3 text-right">Monthly Sales</th>
                <th className="px-4 py-3 text-right">Cumulative</th>
                {salesTarget > 0 && <th className="px-4 py-3 text-right">Expected</th>}
                {salesTarget > 0 && <th className="px-4 py-3 text-center">Status</th>}
                <th className="px-4 py-3 text-right">Clients</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {monthlyData.map((m, idx) => {
                const cumulative = monthlyData.slice(0, idx + 1).reduce((s, x) => s + x.sales, 0);
                const expectedCumulative = monthlyTarget * (idx + 1);
                const onTrack = salesTarget > 0 ? cumulative >= expectedCumulative : true;
                if (!m.isPast && !m.isCurrent) return null;
                return (
                  <tr key={m.month} className={`hover:bg-muted/20 transition-colors ${m.isCurrent ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3 font-medium">
                      {m.fullLabel} {m.isCurrent && <span className="text-[9px] text-primary font-bold ml-1">Current</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">€{m.sales.toLocaleString("en")}</td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">€{cumulative.toLocaleString("en")}</td>
                    {salesTarget > 0 && <td className="px-4 py-3 text-right text-muted-foreground">€{expectedCumulative.toLocaleString("en", { maximumFractionDigits: 0 })}</td>}
                    {salesTarget > 0 && (
                      <td className="px-4 py-3 text-center">
                        {onTrack ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 flex items-center gap-1 justify-center w-fit mx-auto">
                            <CheckCircle2 className="w-3 h-3" /> On Track
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 flex items-center gap-1 justify-center w-fit mx-auto">
                            <AlertTriangle className="w-3 h-3" /> Behind
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-muted-foreground">{m.clients}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
