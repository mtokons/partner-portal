import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import {
  getCustomerPackages, getSessionsByCustomer,
  getNotifications, getCustomerById,
} from "@/lib/sharepoint";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, Calendar, CheckCircle, Clock, Bell, CreditCard,
} from "lucide-react";

const statusColor: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  pending: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export default async function CustomerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/customer-login");
  const user = session.user as SessionUser;

  const [[packages, sessions, notifications], rate] = await Promise.all([
    Promise.all([
      getCustomerPackages(user.id),
      getSessionsByCustomer(user.id),
      getNotifications(user.id),
    ]),
    loadRate(),
  ]);

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const upcomingSessions = sessions.filter((s) => s.status === "scheduled").length;
  const pendingSessions = sessions.filter((s) => s.status === "pending").length;
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const totalOwed = packages.reduce((s, p) => s + (p.totalAmount - p.amountPaid), 0);
  const totalPaid = packages.reduce((s, p) => s + p.amountPaid, 0);

  const recentSessions = sessions
    .filter((s) => s.status === "completed" || s.status === "scheduled")
    .sort((a, b) => new Date(b.completedAt || b.scheduledAt || b.createdAt).getTime() - new Date(a.completedAt || a.scheduledAt || a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name?.split(" ")[0]}!</h1>
        <p className="text-sm text-gray-500 mt-1">Here's an overview of your services and upcoming activity.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Active Packages</CardTitle>
            <Package className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packages.filter((p) => p.status === "active").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Sessions Done</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedSessions}</div>
            <p className="text-xs text-gray-400">of {totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{upcomingSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{fmtBdt(totalOwed, rate, { compact: true })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{unreadNotifications}</div>
            <p className="text-xs text-gray-400">unread</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Package Status */}
        <Card>
          <CardHeader>
            <CardTitle>My Packages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {packages.map((pkg) => {
              const remaining = pkg.totalSessions - pkg.completedSessions;
              const progressPct = Math.round((pkg.completedSessions / pkg.totalSessions) * 100);
              return (
                <div key={pkg.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{pkg.packageName}</p>
                      <p className="text-xs text-gray-500">{pkg.expertName ? `Expert: ${pkg.expertName}` : "Expert not yet assigned"}</p>
                    </div>
                    <Badge className={pkg.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {pkg.status}
                    </Badge>
                  </div>
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{pkg.completedSessions} of {pkg.totalSessions} sessions</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                  {/* financials */}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Paid: <strong className="text-green-600">{fmtBdt(pkg.amountPaid, rate, { compact: true })}</strong></span>
                    <span className="text-gray-500">Due: <strong className="text-orange-600">{fmtBdt(pkg.totalAmount - pkg.amountPaid, rate, { compact: true })}</strong></span>
                    <span className="text-gray-500">Valid until: {new Date(pkg.endDate).toLocaleDateString("en-GB")}</span>
                  </div>
                </div>
              );
            })}
            {packages.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No packages yet</p>}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent &amp; Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 text-sm border-b pb-3 last:border-0">
                <Badge className={statusColor[s.status] || "bg-gray-100 text-gray-800"}>
                  {s.status}
                </Badge>
                <div className="flex-1">
                  <p className="font-medium">Session #{s.sessionNumber} of {s.totalSessions}</p>
                  <p className="text-xs text-gray-500">
                    {s.status === "completed" && s.completedAt ? `Completed ${new Date(s.completedAt).toLocaleDateString("en-GB")}` : ""}
                    {s.status === "scheduled" && s.scheduledAt ? `Scheduled ${new Date(s.scheduledAt).toLocaleDateString("en-GB")}` : ""}
                  </p>
                </div>
                {s.expertName && <span className="text-xs text-gray-400">{s.expertName}</span>}
              </div>
            ))}
            {recentSessions.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No sessions yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Unread notifications preview */}
      {notifications.filter((n) => !n.read).length > 0 && (
        <Card className="border-teal-200 bg-teal-50">
          <CardHeader>
            <CardTitle className="text-teal-700 text-sm">New Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.filter((n) => !n.read).slice(0, 3).map((n) => (
              <div key={n.id} className="flex gap-2 text-sm">
                <Bell className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-teal-800">{n.title}</p>
                  <p className="text-xs text-teal-700">{n.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
