import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail } from "@/lib/sharepoint";
import { getCandidates, getPayouts, getCandidateTasksByPartner, getSalesOffers, getInvoices } from "@/lib/sharepoint";

import { RevenueCard } from "@/components/partner/RevenueCard";
import { CandidateStatsCard } from "@/components/partner/CandidateStatsCard";
import { TasksWidget } from "@/components/partner/TasksWidget";
import { Award, FileText, ShoppingBag, AlertCircle, TrendingUp, Users, DollarSign } from "lucide-react";
import Link from "next/link";

const TIER_COLORS = {
  Silver: "text-slate-500 dark:text-slate-400",
  Gold: "text-yellow-500 dark:text-yellow-400",
  Diamond: "text-cyan-500 dark:text-cyan-400",
  Platinum: "text-purple-500 dark:text-purple-400",
};

const TIER_BG = {
  Silver: "from-slate-500/10 to-slate-600/5 border-slate-500/20",
  Gold: "from-yellow-500/10 to-amber-600/5 border-yellow-500/20",
  Diamond: "from-cyan-500/10 to-blue-600/5 border-cyan-500/20",
  Platinum: "from-purple-500/10 to-pink-600/5 border-purple-500/20",
};

export default async function PartnerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const partnerId = partner.id;

  const [candidates, payouts, tasks, offers, invoices] = await Promise.all([
    getCandidates(partnerId),
    getPayouts(partnerId),
    getCandidateTasksByPartner(partnerId),
    getSalesOffers(partnerId),
    getInvoices(partnerId),
  ]);

  const tierStatus = partner.tierStatus || "Silver";
  const margin = partner.marginPercentage || 15;

  // Quick stats for overview bar
  const pendingOffers = offers.filter((o) => o.status === "sent" || o.status === "draft").length;
  const unpaidInvoices = invoices.filter((i) => i.status === "overdue" || i.status === "sent").length;
  const activeTasks = tasks.filter((t) => t.status === "todo" || t.status === "in-progress").length;
  // Derive revenue from candidates' partnerShare (populated via registration workflow)
  const totalRevenue = candidates.reduce((s, c) => s + (c.partnerShare || 0), 0)
    || payouts.reduce((s, p) => s + p.net, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Partner Tier Banner */}
      <div className={`rounded-2xl border bg-gradient-to-r p-5 flex items-center justify-between ${TIER_BG[tierStatus]}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-white/80 dark:bg-white/10`}>
            <Award className={`w-6 h-6 ${TIER_COLORS[tierStatus]}`} />
          </div>
          <div>
            <p className={`text-lg font-bold ${TIER_COLORS[tierStatus]}`}>
              Proud SCCG {tierStatus} Partner
            </p>
            <p className="text-sm text-muted-foreground">
              Welcome back, {partner.name ?? user.email} &middot; {margin}% commission rate
            </p>
          </div>
        </div>
        <Link
          href="/partner/settings"
          className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors"
        >
          Account Settings
        </Link>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/partner/candidates" className="group">
          <div className="bg-card rounded-xl border p-4 hover:shadow-md hover:border-blue-500/30 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Candidates</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{candidates.length}</p>
          </div>
        </Link>
        <Link href="/partner/finance/revenue" className="group">
          <div className="bg-card rounded-xl border p-4 hover:shadow-md hover:border-emerald-500/30 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              €{totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </p>
          </div>
        </Link>
        <Link href="/partner/offers" className="group">
          <div className="bg-card rounded-xl border p-4 hover:shadow-md hover:border-amber-500/30 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Open Offers</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{pendingOffers}</p>
          </div>
        </Link>
        <Link href="/partner/tasks" className="group">
          <div className="bg-card rounded-xl border p-4 hover:shadow-md hover:border-red-500/30 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Active Tasks</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{activeTasks}</p>
          </div>
        </Link>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueCard payouts={payouts} candidates={candidates} partnerMargin={margin} />
        <CandidateStatsCard candidates={candidates} />
        <TasksWidget tasks={tasks} />
      </div>
    </div>
  );
}
