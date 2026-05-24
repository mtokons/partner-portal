import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser, WorkflowCategory } from "@/types";
import { getPartnerByEmail, getCandidates, getTransactions, getProducts } from "@/lib/sharepoint";
import { format, parseISO } from "date-fns";
import {
  ArrowUpRight, DollarSign, CheckCircle2, Clock, AlertTriangle,
  CreditCard, TrendingUp, Package, Sparkles, ArrowRight
} from "lucide-react";
import Link from "next/link";

export default async function SccgPaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const [candidates, transactions, products] = await Promise.all([
    getCandidates(partner.id),
    getTransactions(partner.id),
    getProducts().catch(() => []),
  ]);

  const margin = partner.marginPercentage || 15;

  // === SCCG SETTLEMENT CALCULATIONS ===
  const totalSccgShare = candidates.reduce((s, c) => s + (c.sccgShare || 0), 0);
  const payments = transactions.filter((t) => t.type === "payment");
  const totalPaidToSccg = payments.reduce((s, t) => s + t.amount, 0);
  const outstandingBalance = Math.max(0, totalSccgShare - totalPaidToSccg);
  const paidPercentage = totalSccgShare > 0 ? Math.min(100, (totalPaidToSccg / totalSccgShare) * 100) : 0;

  // Per-sale SCCG amounts with reference tracking
  const salesWithSccg = candidates
    .filter((c) => (c.sccgShare || 0) > 0)
    .map((c) => {
      // Find payments referencing this candidate
      const relatedPayments = transactions.filter(
        (t) => t.type === "payment" && (t.clientId === c.id || t.orderId === c.id)
      );
      const paidForThis = relatedPayments.reduce((s, t) => s + t.amount, 0);
      return {
        ...c,
        sccgPaid: paidForThis,
        sccgDue: Math.max(0, (c.sccgShare || 0) - paidForThis),
      };
    })
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const clientsWithDue = salesWithSccg.filter((c) => c.sccgDue > 0).length;
  const clientsSettled = salesWithSccg.filter((c) => c.sccgDue === 0).length;

  // === PRODUCT INSIGHTS — most sold categories ===
  const categoryCounts: Record<string, number> = {};
  candidates.forEach((c) => {
    const cat = c.workflowCategory || "Other";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-indigo-500" />
            SCCG Settlements
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your payments to SCCG, outstanding balances, and payment history
          </p>
        </div>
        <Link
          href="/partner/finance/payments"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          <CreditCard className="w-4 h-4" /> Make Payment
        </Link>
      </div>

      {/* Settlement KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-indigo-600/10 to-indigo-500/5 border-2 border-indigo-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider font-bold">Total SCCG Share</p>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-indigo-500 mt-1">€{totalSccgShare.toLocaleString("en", { minimumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{100 - margin}% of all sales</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Paid to SCCG</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-500 mt-1">€{totalPaidToSccg.toLocaleString("en", { minimumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{payments.length} payment(s) made</p>
        </div>
        <div className={`bg-gradient-to-br ${outstandingBalance > 0 ? "from-amber-600/10 to-orange-500/5 border-2 border-amber-500/20" : "from-emerald-600/10 to-green-500/5 border-2 border-emerald-500/20"} rounded-2xl p-5`}>
          <div className="flex items-center justify-between">
            <p className={`text-[10px] ${outstandingBalance > 0 ? "text-amber-400" : "text-emerald-400"} uppercase tracking-wider font-bold`}>Outstanding</p>
            {outstandingBalance > 0 ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <p className={`text-2xl font-extrabold mt-1 ${outstandingBalance > 0 ? "text-amber-500" : "text-emerald-500"}`}>€{outstandingBalance.toLocaleString("en", { minimumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{clientsWithDue} sale(s) pending</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600/10 to-blue-500/5 border-2 border-blue-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">Settlement Rate</p>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-blue-500 mt-1">{paidPercentage.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{clientsSettled} settled / {salesWithSccg.length} total</p>
        </div>
      </div>

      {/* Settlement Progress Bar */}
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground text-sm">Settlement Progress</h3>
          <div className="text-right text-xs">
            <span className="font-bold text-foreground">€{totalPaidToSccg.toLocaleString("en")}</span>
            <span className="text-muted-foreground"> / €{totalSccgShare.toLocaleString("en")}</span>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${paidPercentage >= 100 ? "bg-gradient-to-r from-emerald-500 to-green-400" : paidPercentage >= 50 ? "bg-gradient-to-r from-blue-500 to-cyan-400" : "bg-gradient-to-r from-amber-500 to-orange-400"}`}
            style={{ width: `${paidPercentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {outstandingBalance > 0
            ? `€${outstandingBalance.toLocaleString("en")} remaining to settle`
            : "All payments settled — great job!"}
        </p>
      </div>

      {/* Per-Sale SCCG Breakdown */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> SCCG Share per Sale
          </h3>
          <span className="text-[10px] text-muted-foreground uppercase font-bold">{salesWithSccg.length} sales</span>
        </div>
        {salesWithSccg.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="font-medium">No sales with SCCG share yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                  <th className="px-4 py-3 text-left">Sale / Client</th>
                  <th className="px-4 py-3 text-left">Service</th>
                  <th className="px-4 py-3 text-right">Total Fee</th>
                  <th className="px-4 py-3 text-right">SCCG Share</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Due</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {salesWithSccg.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{c.fullName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{c.sccgId || c.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.workflowCategory}</td>
                    <td className="px-4 py-3 text-right font-medium">€{(c.totalServiceFee || 0).toLocaleString("en")}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-500">€{(c.sccgShare || 0).toLocaleString("en")}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-500">€{c.sccgPaid.toLocaleString("en")}</td>
                    <td className={`px-4 py-3 text-right font-bold ${c.sccgDue > 0 ? "text-amber-500" : "text-emerald-500"}`}>€{c.sccgDue.toLocaleString("en")}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.sccgDue === 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                        {c.sccgDue === 0 ? "Settled" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment History to SCCG */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Payment History to SCCG
          </h3>
          <Link href="/partner/finance/payments" className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1">
            Make Payment <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {payments.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No payments to SCCG yet</p>
            <p className="text-xs opacity-60 mt-1">Payments you make to SCCG will appear here.</p>
          </div>
        ) : (
          <div className="divide-y">
            {[...payments].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((t) => (
              <div key={t.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-foreground">€{t.amount.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.date ? format(parseISO(t.date), "dd MMM yyyy") : "—"} · Ref: {t.reference || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t.description || "Payment to SCCG"}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500">Completed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Insights & SCCG Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Most Sold Services */}
        <div className="bg-card border rounded-2xl p-5">
          <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Most Sold Services
          </h3>
          {sortedCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No sales data yet.</p>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map(([cat, count], idx) => {
                const total = candidates.length;
                const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
                const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500"];
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1.5">
                        {idx === 0 && <Sparkles className="w-3 h-3 text-amber-400" />}
                        {cat}
                      </span>
                      <span className="text-muted-foreground">{count} sale(s) · {pct}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full ${colors[idx % colors.length]}/60`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SCCG Financial Info */}
        <div className="bg-card border rounded-2xl p-5">
          <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" /> SCCG Updates & Offers
          </h3>
          <div className="space-y-3">
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-500 mb-1">Commission Rate</p>
              <p className="text-sm text-foreground">
                Your current rate: <span className="font-extrabold text-emerald-500">{margin}%</span> commission on all sales.
                SCCG receives {100 - margin}% for service delivery.
              </p>
            </div>
            <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-4">
              <p className="text-xs font-bold text-purple-500 mb-1">Partner Level</p>
              <p className="text-sm text-foreground">
                You are a <span className="font-extrabold">{partner.tierStatus || "Silver"}</span> Partner.
                Higher tiers unlock better commission rates and priority support.
              </p>
            </div>
            {topCategory && (
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-500 mb-1">Top Performing Service</p>
                <p className="text-sm text-foreground">
                  <span className="font-extrabold">{topCategory[0]}</span> is your most sold service
                  with {topCategory[1]} sale(s). Keep pushing!
                </p>
              </div>
            )}
            {products.length > 0 && (
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
                <p className="text-xs font-bold text-emerald-500 mb-1">Available Products</p>
                <p className="text-sm text-foreground">
                  {products.length} service package(s) available.
                  <Link href="/partner/marketplace" className="text-primary font-bold hover:underline ml-1">
                    Browse Marketplace →
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
