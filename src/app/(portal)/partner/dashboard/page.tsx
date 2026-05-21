import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail } from "@/lib/sharepoint";
import { getCandidates, getPayouts, getCandidateTasksByPartner } from "@/lib/sharepoint";
import { getTierFromCommission } from "@/lib/engine/financial-split";
import { RevenueCard } from "@/components/partner/RevenueCard";
import { CandidateStatsCard } from "@/components/partner/CandidateStatsCard";
import { TasksWidget } from "@/components/partner/TasksWidget";
import { Award } from "lucide-react";

const TIER_COLORS = {
  Silver: "text-slate-500 dark:text-slate-400",
  Gold: "text-yellow-500 dark:text-yellow-400",
  Diamond: "text-cyan-500 dark:text-cyan-400",
  Platinum: "text-purple-500 dark:text-purple-400",
};

export default async function PartnerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const partnerId = partner.id;

  const [candidates, payouts, tasks] = await Promise.all([
    getCandidates(partnerId),
    getPayouts(partnerId),
    getCandidateTasksByPartner(partnerId),
  ]);

  const { tierStatus, margin } = getTierFromCommission(
    partner.commissionTier ?? "standard"
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Partner tier badge */}
      <div className="flex items-center gap-2">
        <Award className={`w-5 h-5 ${TIER_COLORS[tierStatus]}`} />
        <p className="text-sm font-medium text-muted-foreground">
          Proud SCCG{" "}
          <span className={`font-bold ${TIER_COLORS[tierStatus]}`}>
            {tierStatus}
          </span>{" "}
          Partner
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Partner Overview</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Welcome back, {partner.name ?? user.email}
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueCard payouts={payouts} partnerMargin={margin} />
        <CandidateStatsCard candidates={candidates} />
        <TasksWidget tasks={tasks} />
      </div>
    </div>
  );
}
