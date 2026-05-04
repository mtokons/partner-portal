import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getPayouts } from "@/lib/sharepoint";
import { COMMISSION_RATES } from "@/lib/payouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, CheckCircle2, Clock, Users, DollarSign, RefreshCw } from "lucide-react";
import { refreshPayoutsAction } from "./actions";
import { RowActions } from "@/components/RowActions";
import { removePayout, holdPayout } from "@/lib/row-actions";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  eligible: "bg-blue-100 text-blue-700 border-blue-200",
  approved: "bg-violet-100 text-violet-700 border-violet-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default async function AdminPayoutsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const payouts = await getPayouts();

  const totalGross = payouts.reduce((s, p) => s + p.gross, 0);
  const totalNet = payouts.reduce((s, p) => s + p.net, 0);
  const pendingCount = payouts.filter((p) => p.status === "pending" || p.status === "eligible").length;
  const paidCount = payouts.filter((p) => p.status === "paid").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full gradient-blue" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Finance</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Payout Management</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Manage partner, expert, and referrer payouts across all orders.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form action={async () => { "use server"; await refreshPayoutsAction(); }}>
            <button 
              type="submit"
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border/50 text-muted-foreground rounded-2xl font-semibold text-sm hover:text-foreground transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </form>
        </div>
      </div>

      {/* Commission rates info */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Partner (Individual)", value: `${COMMISSION_RATES.partnerIndividual * 100}%` },
          { label: "Partner (Institutional)", value: `${COMMISSION_RATES.partnerInstitutional * 100}%` },
          { label: "Expert (Per Order)", value: `${COMMISSION_RATES.expertPerOrder * 100}%` },
          { label: "Platform Fee", value: `${COMMISSION_RATES.platformFee * 100}%` },
        ].map((rate) => (
          <div key={rate.label} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl text-xs">
            <span className="text-muted-foreground">{rate.label}:</span>
            <span className="font-black text-primary">{rate.value}</span>
          </div>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Payouts", value: payouts.length, icon: Users, color: "text-blue-500", bg: "bg-blue-50 border-blue-100" },
          { label: "Pending/Eligible", value: pendingCount, icon: Clock, color: "text-amber-500", bg: "bg-amber-50 border-amber-100" },
          { label: "Paid Out", value: paidCount, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Total Net (BDT)", value: `${(totalNet / 1000).toFixed(1)}K`, icon: DollarSign, color: "text-violet-500", bg: "bg-violet-50 border-violet-100" },
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

      {/* Payouts table */}
      <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            All Payouts
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {payouts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Wallet className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No payouts yet. They are generated automatically when orders complete.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Recipient", "Type", "Order", "Gross", "Net", "Status", "Date", ""].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">{payout.recipientName}</p>
                        <p className="text-xs text-muted-foreground">{payout.recipientId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize rounded-full text-[10px]">
                          {payout.recipientType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                        {payout.relatedOrderNumber || payout.relatedOrderId.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 font-semibold">BDT {payout.gross.toLocaleString()}</td>
                      <td className="px-6 py-4 font-black text-primary">BDT {payout.net.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <Badge className={`capitalize rounded-full text-[10px] border ${statusColors[payout.status] || ""}`}>
                          {payout.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {payout.payoutDate
                          ? new Date(payout.payoutDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </td>                      <td className="px-6 py-4 text-right">
                        <RowActions
                          entityLabel="payout"
                          isOnHold={!!payout.isOnHold}
                          onHold={async () => { "use server"; return holdPayout(payout.id, !payout.isOnHold); }}
                          onDelete={async () => { "use server"; return removePayout(payout.id); }}
                        />
                      </td>                    </tr>
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
