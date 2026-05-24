import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getPayouts } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  eligible: "bg-blue-100 text-blue-700 border-blue-200",
  approved: "bg-violet-100 text-violet-700 border-violet-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default async function MyPayoutsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  // Partners see only their own payouts
  const myId = user.partnerId || user.id;
  const payouts = await getPayouts(user.role === "admin" ? undefined : myId);

  const earned = payouts.reduce((s, p) => s + p.net, 0);
  const pending = payouts.filter((p) => p.status === "pending" || p.status === "eligible").length;
  const paid = payouts.filter((p) => p.status === "paid").length;
  const paidTotal = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.net, 0);

  return (
    <div className="space-y-7 page-enter">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-1 rounded-full gradient-green" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Finance</p>
        </div>
        <h1 className="text-3xl font-black tracking-tight">My Payouts</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Your commission and referral earnings from completed orders.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Payouts", value: payouts.length, icon: Wallet, color: "text-blue-500", bg: "bg-blue-50 border-blue-100" },
          { label: "Pending", value: pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-50 border-amber-100" },
          { label: "Paid Out", value: paid, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Total Paid (BDT)", value: `${paidTotal.toLocaleString()}`, icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-50 border-violet-100" },
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

      {/* Earnings summary bar */}
      <div className="bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 rounded-3xl px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Total Lifetime Earnings</p>
          <p className="text-4xl font-black text-primary mt-1">BDT {earned.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-muted-foreground">Pending Release</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            BDT {payouts.filter((p) => p.status !== "paid").reduce((s, p) => s + p.net, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Payouts table */}
      <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Payout History
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {payouts.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Wallet className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-semibold">No payouts yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Payouts are generated when your Sales Orders are completed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Order", "Type", "Gross", "Deductions", "Net Payout", "Status", "Paid Date"].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {payout.relatedOrderNumber || payout.relatedOrderId.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize rounded-full text-[10px]">{payout.recipientType}</Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">BDT {payout.gross.toLocaleString()}</td>
                      <td className="px-6 py-4 text-rose-600 text-xs">−BDT {payout.deductions.toLocaleString()}</td>
                      <td className="px-6 py-4 font-black text-foreground text-lg">BDT {payout.net.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <Badge className={`capitalize rounded-full text-[10px] border ${statusColors[payout.status] || ""}`}>
                          {payout.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {payout.payoutDate
                          ? new Date(payout.payoutDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
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
