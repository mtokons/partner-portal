import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartners, getCandidates, getTransactions } from "@/lib/sharepoint";
import { DollarSign, ArrowLeft, TrendingUp, Wallet, Target, Users, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function AdminPartnerFinancePage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const { id } = await props.params;
  const partners = await getPartners();
  const partner = partners.find((p) => p.id === id);
  if (!partner) redirect("/admin/partners");

  const [candidates, allTransactions] = await Promise.all([
    getCandidates(partner.id),
    getTransactions(partner.id),
  ]);

  const marginPercent = partner.marginPercentage || 15;
  const salesTarget = partner.salesTarget || 0;

  // Calculate totals
  const totalSales = candidates.reduce((s, c) => s + (c.totalServiceFee || 0), 0);
  const totalReceived = candidates.reduce((s, c) => s + (c.depositAmount || 0), 0);
  const totalPartnerShare = candidates.reduce((s, c) => s + (c.partnerShare || 0), 0);
  const totalSccgShare = candidates.reduce((s, c) => s + (c.sccgShare || 0), 0);
  const totalPaidToSccg = allTransactions.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0);
  const outstandingToSccg = Math.max(0, totalSccgShare - totalPaidToSccg);
  const clientDues = Math.max(0, totalSales - totalReceived);
  const targetProgress = salesTarget > 0 ? Math.min(100, (totalSales / salesTarget) * 100) : 0;

  const statusCounts = {
    pending: candidates.filter((c) => c.paymentStatus === "pending").length,
    depositPaid: candidates.filter((c) => c.paymentStatus === "deposit-paid").length,
    fullyPaid: candidates.filter((c) => c.paymentStatus === "fully-paid").length,
    refunded: candidates.filter((c) => c.paymentStatus === "refunded").length,
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/partners" className="p-2 rounded-xl bg-muted hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-2xl">
          <DollarSign className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            {partner.name} — Financial Status
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {partner.company} · {partner.email} · {partner.tierStatus || "Silver"} Partner · {marginPercent}% Margin
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-gradient-to-br from-blue-600/10 to-blue-500/5 border-2 border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">Total Sales</p>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-extrabold text-foreground mt-1">€{totalSales.toLocaleString("en", { minimumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{candidates.length} clients</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Collected</p>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-extrabold text-emerald-500 mt-1">€{totalReceived.toLocaleString("en", { minimumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">From clients</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/10 to-purple-500/5 border-2 border-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-purple-400 uppercase tracking-wider font-bold">Partner Commission</p>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-extrabold text-purple-500 mt-1">€{totalPartnerShare.toLocaleString("en", { minimumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{marginPercent}% margin</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-600/10 to-indigo-500/5 border-2 border-indigo-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider font-bold">SCCG Share</p>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-extrabold text-indigo-500 mt-1">€{totalSccgShare.toLocaleString("en", { minimumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{100 - marginPercent}% to SCCG</p>
        </div>
        <div className="bg-gradient-to-br from-amber-600/10 to-orange-500/5 border-2 border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">Owes to SCCG</p>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-extrabold text-amber-500 mt-1">€{outstandingToSccg.toLocaleString("en", { minimumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Paid: €{totalPaidToSccg.toLocaleString("en")}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-600/10 to-rose-500/5 border-2 border-rose-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-rose-400 uppercase tracking-wider font-bold">Client Dues</p>
            <Users className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-extrabold text-rose-500 mt-1">€{clientDues.toLocaleString("en", { minimumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{statusCounts.pending + statusCounts.depositPaid} pending</p>
        </div>
      </div>

      {/* Sales Target */}
      {salesTarget > 0 && (
        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-foreground text-sm">Annual Sales Target</h3>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-foreground">€{totalSales.toLocaleString("en")}</span>
              <span className="text-sm text-muted-foreground"> / €{salesTarget.toLocaleString("en")}</span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${targetProgress >= 100 ? "bg-gradient-to-r from-emerald-500 to-green-400" : targetProgress >= 75 ? "bg-gradient-to-r from-blue-500 to-cyan-400" : targetProgress >= 50 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-rose-500 to-orange-400"}`}
              style={{ width: `${targetProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{targetProgress.toFixed(1)}% achieved</p>
        </div>
      )}

      {/* Client Payment Status */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-amber-500">{statusCounts.pending}</p>
          <p className="text-xs text-muted-foreground font-bold mt-1">Pending</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-blue-500">{statusCounts.depositPaid}</p>
          <p className="text-xs text-muted-foreground font-bold mt-1">Deposit Paid</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-emerald-500">{statusCounts.fullyPaid}</p>
          <p className="text-xs text-muted-foreground font-bold mt-1">Fully Paid</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-red-500">{statusCounts.refunded}</p>
          <p className="text-xs text-muted-foreground font-bold mt-1">Refunded</p>
        </div>
      </div>

      {/* Client List */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            All Clients ({candidates.length})
          </h3>
        </div>
        {candidates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="font-medium">No clients yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">SCCG ID</th>
                  <th className="px-4 py-3 text-right">Total Fee</th>
                  <th className="px-4 py-3 text-right">Received</th>
                  <th className="px-4 py-3 text-right">Due</th>
                  <th className="px-4 py-3 text-right">Partner Share</th>
                  <th className="px-4 py-3 text-right">SCCG Share</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {candidates.map((c) => {
                  const due = Math.max(0, (c.totalServiceFee || 0) - (c.depositAmount || 0));
                  const sColors: Record<string, string> = {
                    pending: "bg-amber-500/10 text-amber-500",
                    "deposit-paid": "bg-blue-500/10 text-blue-500",
                    "fully-paid": "bg-emerald-500/10 text-emerald-500",
                    refunded: "bg-red-500/10 text-red-500",
                  };
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold">{c.fullName}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{c.sccgId || "—"}</td>
                      <td className="px-4 py-3 text-right font-bold">€{(c.totalServiceFee || 0).toLocaleString("en")}</td>
                      <td className="px-4 py-3 text-right text-emerald-500 font-bold">€{(c.depositAmount || 0).toLocaleString("en")}</td>
                      <td className={`px-4 py-3 text-right font-bold ${due > 0 ? "text-rose-500" : "text-emerald-500"}`}>€{due.toLocaleString("en")}</td>
                      <td className="px-4 py-3 text-right text-purple-500 font-bold">€{(c.partnerShare || 0).toLocaleString("en")}</td>
                      <td className="px-4 py-3 text-right text-indigo-500 font-bold">€{(c.sccgShare || 0).toLocaleString("en")}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sColors[c.paymentStatus] || sColors.pending}`}>
                          {c.paymentStatus?.replace("-", " ") || "pending"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction History */}
      {allTransactions.length > 0 && (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b bg-muted/30">
            <h3 className="font-bold text-foreground text-sm">
              SCCG Payment History ({allTransactions.length} transactions)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allTransactions.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{t.date || "—"}</td>
                    <td className="px-4 py-3 capitalize font-medium">{t.type.replace("-", " ")}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{t.reference || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.description || "—"}</td>
                    <td className={`px-4 py-3 text-right font-bold ${t.type === "payment" ? "text-emerald-500" : t.type === "refund" ? "text-rose-500" : ""}`}>
                      €{t.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
