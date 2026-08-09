import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { requireSccgAccess } from "@/lib/admin-guard";
import {
  getClients, getPartners, getInstallments, getFinancials,
  getInvoices, getSalesOrders, getCandidates,
} from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Building2, CalendarClock, Euro, AlertTriangle,
  TrendingUp, ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

function eur(n: number): string {
  return `€${Math.round(n).toLocaleString("en-US")}`;
}

export default async function SccgDashboardPage() {
  await requireSccgAccess();
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const roles = (user.roles || [user.role]).map((r) => (r || "").toLowerCase());
  const isAdmin = roles.includes("admin") || roles.includes("sccg-admin");

  const [clients, partners, installments, financials, invoices, orders] = await Promise.all([
    getClients(), getPartners(), getInstallments(), getFinancials(), getInvoices(), getSalesOrders(),
  ]);

  // Candidate payment data — the live "payment system" for partner/candidate sales.
  const candidates = await getCandidates();
  const candidateReceived = candidates.reduce((s, c) => s + (c.depositAmount || 0), 0);
  const candidateDue = candidates.reduce(
    (s, c) => s + Math.max(0, (c.totalServiceFee || 0) - (c.depositAmount || 0)),
    0
  );

  // --- Shared metrics ---
  const totalClients = clients.length;
  const activePartners = partners.filter((p) => p.status === "active").length;

  const today = new Date().toISOString().slice(0, 10);
  const dueToday = installments.filter(
    (i) => i.status !== "paid" && (i.dueDate || "").slice(0, 10) === today
  );
  const dueTodayAmount = dueToday.reduce((s, i) => s + (i.amountEur ?? i.amount ?? 0), 0);

  // --- Admin-only metrics ---
  const financialRevenue = financials.reduce((s, f) => s + (f.revenue || 0), 0);
  const orderRevenue = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + (o.totalAmount || 0), 0);
  // Include actual money received from candidates so the KPI reflects the payment system.
  const totalRevenue = (financialRevenue > 0 ? financialRevenue : orderRevenue) + candidateReceived;

  const unpaidInvoiceAmt = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + (i.amount || 0), 0);
  const overdueInstallmentAmt = installments
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + (i.amountEur ?? i.amount ?? 0), 0);
  const totalDue =
    (financials.reduce((s, f) => s + (f.outstanding || 0), 0) ||
      unpaidInvoiceAmt + overdueInstallmentAmt) + candidateDue;

  const topPartners = [...partners]
    .filter((p) => p.status === "active")
    .sort((a, b) => (b.salesTarget || 0) - (a.salesTarget || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">
          {isAdmin ? "SCCG Admin Dashboard" : "SCCG Staff Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user.name || "SCCG"} — {isAdmin ? "management overview" : "operations overview"}.
        </p>
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Total Revenue / Income"
            value={eur(totalRevenue)}
            icon={<Euro className="h-5 w-5" />}
            accent="from-emerald-500 to-green-700"
            href="/sccg/finance"
          />
          <MetricCard
            label="Total Due Amount"
            value={eur(totalDue)}
            icon={<AlertTriangle className="h-5 w-5" />}
            accent="from-amber-500 to-orange-700"
            href="/sccg/finance/payments"
          />
          <MetricCard
            label="Total Registered Clients"
            value={totalClients.toLocaleString()}
            icon={<Users className="h-5 w-5" />}
            accent="from-indigo-500 to-blue-700"
            href="/sccg/candidates"
          />
          <MetricCard
            label="Active Partners"
            value={activePartners.toLocaleString()}
            icon={<Building2 className="h-5 w-5" />}
            accent="from-fuchsia-500 to-purple-700"
            href="/sccg/partner-performance"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Total Registered Clients"
            value={totalClients.toLocaleString()}
            icon={<Users className="h-5 w-5" />}
            accent="from-indigo-500 to-blue-700"
            href="/sccg/candidates"
          />
          <MetricCard
            label="Current Partners"
            value={activePartners.toLocaleString()}
            icon={<Building2 className="h-5 w-5" />}
            accent="from-fuchsia-500 to-purple-700"
            href="/sccg/partner-performance"
          />
          <MetricCard
            label="Today's Due Payments"
            value={`${dueToday.length} · ${eur(dueTodayAmount)}`}
            icon={<CalendarClock className="h-5 w-5" />}
            accent="from-amber-500 to-orange-700"
            href="/sccg/finance/payments"
          />
        </div>
      )}

      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Partner Performance
            </CardTitle>
            <Link
              href="/sccg/partner-performance"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {topPartners.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active partners yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {topPartners.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.company}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{p.tierStatus || p.commissionTier}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Target {eur(p.salesTarget || 0)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  href?: string;
}) {
  const cardContent = (
    <Card className="group overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer hover:scale-[1.01]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1.5">
            {label}
            {href && (
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 transform -translate-x-1 group-hover:translate-x-0 text-primary shrink-0" />
            )}
          </span>
          <span className={`rounded-lg bg-gradient-to-br ${accent} p-2 text-white shadow-sm group-hover:scale-105 transition-transform`}>{icon}</span>
        </div>
        <div className="mt-3 text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href} className="block focus:outline-none">{cardContent}</Link> : cardContent;
}
