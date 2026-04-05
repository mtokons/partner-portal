import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getReferrals } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-violet-100 text-violet-700 border-violet-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default async function AdminReferralsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const referrals = await getReferrals();

  const totalValue = referrals.reduce((s, r) => s + r.amount, 0);
  const pendingCount = referrals.filter((r) => r.status === "pending").length;
  const paidCount = referrals.filter((r) => r.status === "paid").length;

  return (
    <div className="space-y-7 page-enter">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-1 rounded-full gradient-green" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Sales</p>
        </div>
        <h1 className="text-3xl font-black tracking-tight">Referral Tracking</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Monitor all referral commissions linked to sales offers and orders.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Referrals", value: referrals.length, icon: Share2, color: "text-blue-500", bg: "bg-blue-50 border-blue-100" },
          { label: "Pending", value: pendingCount, icon: Clock, color: "text-amber-500", bg: "bg-amber-50 border-amber-100" },
          { label: "Paid Out", value: paidCount, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Total Value (BDT)", value: `${(totalValue / 1000).toFixed(1)}K`, icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-50 border-violet-100" },
        ].map((kpi) => (
          <div key={kpi.label} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border ${kpi.bg}`}>
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-xl font-black text-foreground leading-none">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            All Referrals
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {referrals.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Share2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No referrals yet. They are created when a referral is added to a Sales Offer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Referrer", "Type", "Offer", "Order", "%", "Amount", "Status"].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">{ref.referrerName}</p>
                        <p className="text-xs text-muted-foreground">{ref.referrerId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize rounded-full text-[10px]">
                          {ref.referrerType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {ref.salesOfferId.slice(0, 8)}…
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {ref.salesOrderId ? `${ref.salesOrderId.slice(0, 8)}…` : "—"}
                      </td>
                      <td className="px-6 py-4 font-black text-foreground">{ref.percentage}%</td>
                      <td className="px-6 py-4 font-black text-primary">BDT {ref.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <Badge className={`capitalize rounded-full text-[10px] border ${statusColors[ref.status] || ""}`}>
                          {ref.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
