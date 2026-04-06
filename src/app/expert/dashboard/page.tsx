import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import {
  getExpertById,
  getSessionsByExpert,
  getExpertPayments,
  getCustomerPackages,
} from "@/lib/sharepoint";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function fmt(n: number, rate: number | null): string {
  return fmtBdt(n, rate, { compact: true });
}

export default async function ExpertDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/expert-login");
  const user = session.user as SessionUser;

  const [[expert, sessions, payments], rate] = await Promise.all([
    Promise.all([
      getExpertById(user.id),
      getSessionsByExpert(user.id),
      getExpertPayments(user.id),
    ]),
    loadRate(),
  ]);

  if (!expert) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[70vh] text-center px-4">
        <div className="h-20 w-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">⏳</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Under Review</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Your expert application is currently being reviewed by the SCCG administrators.
          You will receive access to your dashboard once approved.
        </p>
      </div>
    );
  }
  // Get unique customer packages this expert is assigned to
  const packageIds = [...new Set(sessions.map((s) => s.customerPackageId))];
  const allPackages = await getCustomerPackages();
  const myPackages = allPackages.filter((p) => p.expertId === user.id);

  // Session stats
  const completed = sessions.filter((s) => s.status === "completed").length;
  const scheduled = sessions.filter((s) => s.status === "scheduled").length;
  const pending = sessions.filter((s) => s.status === "pending").length;

  // Earnings stats
  const totalEarned = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const pendingApproval = payments.filter((p) => p.status === "eligible").reduce((sum, p) => sum + p.amount, 0);
  const approved = payments.filter((p) => p.status === "approved").reduce((sum, p) => sum + p.amount, 0);

  // Upcoming sessions
  const upcomingSessions = sessions.filter((s) => s.status === "scheduled").slice(0, 5);
  // Recent completions
  const recentCompleted = sessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {expert.name}</h1>
        <p className="text-gray-500 text-sm mt-1">{expert.specialization} · Rating: ⭐ {expert.rating}/5</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Active Packages</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-indigo-700">{myPackages.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Sessions Completed</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-700">{completed}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Upcoming Sessions</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-700">{scheduled}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Earned</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-gray-900">{fmt(totalEarned, rate)}</p></CardContent>
        </Card>
      </div>

      {/* Earnings Summary */}
      <Card>
        <CardHeader><CardTitle>Earnings Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-xs text-yellow-700 font-medium">Awaiting Approval</p>
              <p className="text-xl font-bold text-yellow-800 mt-1">{fmt(pendingApproval, rate)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-700 font-medium">Approved</p>
              <p className="text-xl font-bold text-blue-800 mt-1">{fmt(approved, rate)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-green-700 font-medium">Paid Out</p>
              <p className="text-xl font-bold text-green-800 mt-1">{fmt(totalEarned, rate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Sessions</CardTitle>
            <Link href="/expert/sessions" className="text-sm text-indigo-600 hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming sessions scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.customerName}</p>
                      <p className="text-xs text-gray-500">
                        Session {s.sessionNumber}/{s.totalSessions} ·{" "}
                        {s.scheduledAt ? new Date(s.scheduledAt).toLocaleDateString("en-GB") : "TBD"}
                      </p>
                    </div>
                    <Link href={`/expert/sessions/${s.id}`} className="text-xs text-indigo-600 hover:underline">
                      Prepare
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Completions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Completions</CardTitle>
            <Link href="/expert/sessions" className="text-sm text-indigo-600 hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {recentCompleted.length === 0 ? (
              <p className="text-gray-500 text-sm">No completed sessions yet.</p>
            ) : (
              <div className="space-y-3">
                {recentCompleted.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.customerName} — Session {s.sessionNumber}</p>
                      <p className="text-xs text-gray-500">
                        {s.completedAt ? new Date(s.completedAt).toLocaleDateString("en-GB") : ""}{" "}
                        {s.durationMinutes ? `· ${s.durationMinutes} min` : ""}
                        {s.customerRating ? ` · ⭐ ${s.customerRating}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">Done</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
