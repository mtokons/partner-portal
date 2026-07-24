import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser, WorkflowCategory } from "@/types";
import { getPartnerByEmail, getCandidates, getTransactions } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import { dual } from "@/lib/formatCurrency";
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { TrendingUp, DollarSign, Wallet, Users, Briefcase, ArrowUpRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function RevenueBreakdownPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const secCur = partner.preferredCurrency || "BDT";
  const [candidates, transactions, rate] = await Promise.all([
    getCandidates(partner.id),
    getTransactions(partner.id),
    secCur !== "EUR" ? getEurToRate(secCur) : Promise.resolve(1),
  ]);

  const margin = partner.marginPercentage || 15;
  const tierStatus = partner.tierStatus || "Silver";

  // === PARTNER-ONLY CALCULATIONS ===
  const totalCommission = candidates.reduce((s, c) => s + (c.partnerShare || 0), 0);
  const receivedFromClients = candidates.reduce((s, c) => s + (c.depositAmount || 0), 0);
  const totalSales = candidates.reduce((s, c) => s + (c.totalServiceFee || 0), 0);
  const paidClients = candidates.filter((c) => c.paymentStatus === "fully-paid").length;
  const pendingClients = candidates.filter((c) => c.paymentStatus !== "fully-paid" && c.paymentStatus !== "refunded").length;
  const earnedFromPaid = candidates.filter((c) => c.paymentStatus === "fully-paid").reduce((s, c) => s + (c.partnerShare || 0), 0);
  const pendingEarnings = candidates.filter((c) => c.paymentStatus !== "fully-paid" && c.paymentStatus !== "refunded").reduce((s, c) => s + (c.partnerShare || 0), 0);

  // === REVENUE BY PRODUCT/SERVICE (workflowCategory) ===
  const categories: WorkflowCategory[] = ["Training & Language", "Ausbildung", "Student", "Opportunity Card", "Others"];
  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    "Training & Language": { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
    Ausbildung: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
    "Student": { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/20" },
    "Opportunity Card": { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
    "Others": { bg: "bg-gray-500/10", text: "text-gray-500", border: "border-gray-500/20" },
  };

  const revenueByCategory = categories.map((cat) => {
    const cs = candidates.filter((c) => c.workflowCategory === cat);
    return {
      category: cat,
      clients: cs.length,
      totalSales: cs.reduce((s, c) => s + (c.totalServiceFee || 0), 0),
      commission: cs.reduce((s, c) => s + (c.partnerShare || 0), 0),
      received: cs.reduce((s, c) => s + (c.depositAmount || 0), 0),
    };
  }).filter((r) => r.clients > 0);

  const maxCatCommission = Math.max(...revenueByCategory.map((r) => r.commission), 1);

  // === MONTHLY COMMISSION TREND (last 6 months) ===
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const mc = candidates.filter((c) =>
      (c.createdAt || c.submittedAt) &&
      isWithinInterval(parseISO(c.createdAt || c.submittedAt || ""), { start, end })
    );
    return {
      label: format(d, "MMM yyyy"),
      short: format(d, "MMM"),
      clients: mc.length,
      commission: mc.reduce((s, c) => s + (c.partnerShare || 0), 0),
      received: mc.reduce((s, c) => s + (c.depositAmount || 0), 0),
    };
  });
  const maxMonthly = Math.max(...months.map((m) => m.commission), 1);

  // === PER-SALE REVENUE TABLE ===
  const sortedCandidates = [...candidates].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-500" />
          My Revenue
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your personal earnings as a {tierStatus} Partner · {margin}% commission rate
        </p>
      </div>

      {/* KPI Cards — Partner Only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Total Commission</p>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-500 mt-1">{dual(totalCommission, secCur, rate)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{margin}% of {dual(totalSales, secCur, rate)} total sales</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600/10 to-blue-500/5 border-2 border-blue-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">Earned (Paid Clients)</p>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-blue-500 mt-1">{dual(earnedFromPaid, secCur, rate)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{paidClients} fully paid clients</p>
        </div>
        <div className="bg-gradient-to-br from-amber-600/10 to-amber-500/5 border-2 border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">Pending Earnings</p>
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-amber-500 mt-1">{dual(pendingEarnings, secCur, rate)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{pendingClients} clients pending</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/10 to-purple-500/5 border-2 border-purple-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-purple-400 uppercase tracking-wider font-bold">Total Clients</p>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-purple-500 mt-1">{candidates.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Avg {dual(candidates.length > 0 ? Math.round(totalCommission / candidates.length) : 0, secCur, rate)} per client
          </p>
        </div>
      </div>

      {/* Revenue by Service/Product */}
      <div className="bg-card border rounded-2xl p-5">
        <h2 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" /> Commission by Service Category
        </h2>
        {revenueByCategory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No sales data yet.</p>
        ) : (
          <div className="space-y-3">
            {revenueByCategory.map((r) => {
              const c = categoryColors[r.category] || categoryColors.Training;
              const pct = totalCommission > 0 ? ((r.commission / totalCommission) * 100).toFixed(1) : "0";
              return (
                <div key={r.category} className={`${c.bg} border ${c.border} rounded-xl p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${c.text}`}>{r.category}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{r.clients} client(s)</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-extrabold ${c.text}`}>{dual(r.commission, secCur, rate)}</span>
                      <span className="text-xs text-muted-foreground ml-2">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${c.text.replace("text-", "bg-")}/60`} style={{ width: `${(r.commission / maxCatCommission) * 100}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                    <span>Sales: {dual(r.totalSales, secCur, rate)}</span>
                    <span>Received: {dual(r.received, secCur, rate)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Commission Trend */}
      <div className="bg-card border rounded-2xl p-5">
        <h2 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Monthly Commission Trend
        </h2>
        <div className="flex items-end gap-3 h-44">
          {months.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              {m.commission > 0 && (
                <p className="text-[9px] font-bold text-foreground">{dual(m.commission, secCur, rate)}</p>
              )}
              <div className="w-full bg-emerald-500/70 rounded-lg transition-all"
                style={{ height: `${Math.max(4, (m.commission / maxMonthly) * 130)}px` }}
                title={`Commission: ${dual(m.commission, secCur, rate)}`} />
              <p className="text-[10px] text-muted-foreground font-medium">{m.short}</p>
              <p className="text-[9px] text-muted-foreground">{m.clients} sales</p>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Sale Revenue Breakdown */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Revenue per Sale
          </h3>
          <span className="text-[10px] text-muted-foreground uppercase font-bold">{sortedCandidates.length} sales</span>
        </div>
        {sortedCandidates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="font-medium">No sales recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Service</th>
                  <th className="px-4 py-3 text-right">Sale Amount</th>
                  <th className="px-4 py-3 text-right">Your Commission</th>
                  <th className="px-4 py-3 text-center">Payment</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedCandidates.map((c) => {
                  const sc: Record<string, string> = {
                    pending: "bg-amber-500/10 text-amber-500",
                    "deposit-paid": "bg-blue-500/10 text-blue-500",
                    "fully-paid": "bg-emerald-500/10 text-emerald-500",
                    refunded: "bg-red-500/10 text-red-500",
                  };
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/partner/candidates/${c.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                          {c.fullName}
                        </Link>
                        <p className="text-[10px] text-muted-foreground font-mono">{c.sccgId || c.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${(categoryColors[c.workflowCategory] || categoryColors.Training).bg} ${(categoryColors[c.workflowCategory] || categoryColors.Training).text} ${(categoryColors[c.workflowCategory] || categoryColors.Training).border}`}>
                          {c.workflowCategory}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{dual(c.totalServiceFee || 0, secCur, rate)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-500">{dual(c.partnerShare || 0, secCur, rate)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sc[c.paymentStatus] || sc.pending}`}>
                          {c.paymentStatus?.replace("-", " ") || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.createdAt ? format(parseISO(c.createdAt), "dd MMM yyyy") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
