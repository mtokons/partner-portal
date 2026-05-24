import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getPayouts, getInvoices, getCandidates } from "@/lib/sharepoint";
import { getTierFromCommission } from "@/lib/engine/financial-split";
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { TrendingUp, DollarSign, ArrowUpRight, PieChart } from "lucide-react";
import Link from "next/link";

export default async function RevenueBreakdownPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const [payouts, invoices, candidates] = await Promise.all([
    getPayouts(partner.id),
    getInvoices(partner.id),
    getCandidates(partner.id),
  ]);

  const { tierStatus, margin } = getTierFromCommission(partner.commissionTier ?? "standard");

  // Revenue calculations — primary source is candidates' partnerShare/sccgShare
  const totalGross = candidates.reduce((s, c) => s + (c.totalServiceFee || 0), 0)
    || payouts.reduce((s, p) => s + p.gross, 0);
  const totalNet = candidates.reduce((s, c) => s + (c.partnerShare || 0), 0)
    || payouts.reduce((s, p) => s + p.net, 0);
  const sccgShare = candidates.reduce((s, c) => s + (c.sccgShare || 0), 0)
    || (totalGross - totalNet);
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const pendingInvoices = invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  const totalPaid = paidInvoices.reduce((s, i) => s + i.amount, 0)
    || candidates.filter((c) => c.paymentStatus === "fully-paid").reduce((s, c) => s + (c.partnerShare || 0), 0);
  const totalPending = pendingInvoices.reduce((s, i) => s + i.amount, 0)
    || candidates.filter((c) => c.paymentStatus !== "fully-paid").reduce((s, c) => s + (c.partnerShare || 0), 0);

  // Monthly breakdown for last 6 months — use candidates as primary source
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const monthCandidates = candidates.filter(
      (c) => (c.createdAt || c.submittedAt) &&
        isWithinInterval(parseISO(c.createdAt || c.submittedAt || ""), { start, end })
    );
    const monthPayouts = payouts.filter(
      (p) => p.createdAt && isWithinInterval(parseISO(p.createdAt), { start, end })
    );
    const gross = monthCandidates.length > 0
      ? monthCandidates.reduce((s, c) => s + (c.totalServiceFee || 0), 0)
      : monthPayouts.reduce((s, p) => s + p.gross, 0);
    const net = monthCandidates.length > 0
      ? monthCandidates.reduce((s, c) => s + (c.partnerShare || 0), 0)
      : monthPayouts.reduce((s, p) => s + p.net, 0);
    return {
      label: format(d, "MMM yyyy"),
      shortLabel: format(d, "MMM"),
      gross,
      net,
    };
  });

  const maxGross = Math.max(...months.map((m) => m.gross), 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-500" />
          Revenue Breakdown
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {tierStatus} Partner · {margin}% commission rate
        </p>
      </div>

      {/* Top KPI Cards — with drill-down links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/partner/candidates" className="bg-card border rounded-2xl p-5 hover:border-primary/30 transition-colors group">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Earnings</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            €{totalGross.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {candidates.length} candidate(s) <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>
        <Link href="/partner/finance/payments" className="bg-card border rounded-2xl p-5 hover:border-emerald-500/30 transition-colors group">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Your Share</p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            €{totalNet.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            Net partner earnings ({margin}%) <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>
        <Link href="/partner/finance/due-payments" className="bg-card border rounded-2xl p-5 hover:border-blue-500/30 transition-colors group">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">SCCG Share</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            €{sccgShare.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            Platform commission ({100 - margin}%) <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>
        <Link href="/partner/finance/invoices" className="bg-card border rounded-2xl p-5 hover:border-amber-500/30 transition-colors group">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Pending</p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            €{totalPending.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {pendingInvoices.length} unpaid invoice(s) <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>
      </div>

      {/* Monthly Revenue Chart (CSS bars) */}
      <div className="bg-card border rounded-2xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Monthly Revenue (Last 6 Months)</h2>
        <div className="flex items-end gap-3 h-48">
          {months.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <p className="text-xs font-semibold text-foreground">
                {m.gross > 0 ? `€${(m.gross / 1000).toFixed(1)}k` : "—"}
              </p>
              <div className="w-full flex flex-col items-center gap-0.5">
                <div
                  className="w-full bg-emerald-500/80 rounded-t-md transition-all"
                  style={{ height: `${Math.max(4, (m.net / maxGross) * 140)}px` }}
                  title={`Net: €${m.net.toFixed(0)}`}
                />
                <div
                  className="w-full bg-blue-500/40 rounded-b-md transition-all"
                  style={{ height: `${Math.max(2, ((m.gross - m.net) / maxGross) * 140)}px` }}
                  title={`SCCG: €${(m.gross - m.net).toFixed(0)}`}
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">{m.shortLabel}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/80" /> Your Share
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-500/40" /> SCCG Share
          </span>
        </div>
      </div>

      {/* Revenue by Candidate Status */}
      <div className="bg-card border rounded-2xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Revenue by Candidate Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(["fully-paid", "partially-paid", "pending", "refunded"] as const).map((status) => {
            const count = candidates.filter((c) => c.paymentStatus === status).length;
            const labels: Record<string, string> = {
              "fully-paid": "Fully Paid",
              "partially-paid": "Partially Paid",
              pending: "Pending",
              refunded: "Refunded",
            };
            const colors: Record<string, string> = {
              "fully-paid": "text-emerald-500",
              "partially-paid": "text-amber-500",
              pending: "text-blue-500",
              refunded: "text-red-500",
            };
            return (
              <div key={status} className="p-3 rounded-xl bg-muted/30 border text-center">
                <p className={`text-2xl font-bold ${colors[status]}`}>{count}</p>
                <p className="text-xs text-muted-foreground mt-1">{labels[status]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
