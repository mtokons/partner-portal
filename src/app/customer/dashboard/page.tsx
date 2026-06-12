import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import {
  getCustomerPackages, getSessionsByCustomer,
  getNotifications,
} from "@/lib/sharepoint";
import { getCandidatePortalContext } from "@/app/customer/candidate-actions";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, Calendar, CheckCircle, Bell, CreditCard,
  FileText, MessageSquare, ArrowRight, ClipboardList, Sparkles, Compass, Layers3,
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

  const [[packages, sessions, notifications], rate, candidateCtx] = await Promise.all([
    Promise.all([
      getCustomerPackages(user.id),
      getSessionsByCustomer(user.id),
      getNotifications(user.id),
    ]),
    loadRate(),
    getCandidatePortalContext(),
  ]);

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const upcomingSessions = sessions.filter((s) => s.status === "scheduled").length;
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const totalOwed = packages.reduce((s, p) => s + (p.totalAmount - p.amountPaid), 0);
  const totalPaid = packages.reduce((s, p) => s + p.amountPaid, 0);
  const activePackages = packages.filter((p) => p.status === "active").length;
  const leadCandidate = candidateCtx.candidates[0];

  const recentSessions = sessions
    .filter((s) => s.status === "completed" || s.status === "scheduled")
    .sort((a, b) => new Date(b.completedAt || b.scheduledAt || b.createdAt).getTime() - new Date(a.completedAt || a.scheduledAt || a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="candidate-hero">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <Badge className="w-fit border-white/20 bg-white/14 text-white shadow-sm backdrop-blur-sm">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Candidate Experience
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Welcome back, {user.name?.split(" ")[0]}.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-white/78 sm:text-base">
                Track your applications, services, offers, and progress from a single premium workspace designed to keep your journey clear and professional.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="candidate-hero-stat">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/58">Registrations</p>
                <p className="mt-2 text-2xl font-semibold text-white">{candidateCtx.candidates.length}</p>
                <p className="mt-1 text-xs text-white/68">Active records in your workflow</p>
              </div>
              <div className="candidate-hero-stat">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/58">Offers Ready</p>
                <p className="mt-2 text-2xl font-semibold text-white">{candidateCtx.offers.length}</p>
                <p className="mt-1 text-xs text-white/68">Commercial proposals awaiting review</p>
              </div>
              <div className="candidate-hero-stat">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/58">Payments Cleared</p>
                <p className="mt-2 text-2xl font-semibold text-white">{fmtBdt(totalPaid, rate, { compact: true })}</p>
                <p className="mt-1 text-xs text-white/68">Recognized across your packages</p>
              </div>
            </div>
          </div>

          <div className="candidate-spotlight-card w-full max-w-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Journey Snapshot</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {leadCandidate?.sccgId || `${activePackages} active package${activePackages === 1 ? "" : "s"}`}
                </p>
              </div>
              <div className="rounded-2xl border border-white/50 bg-white/65 p-3 text-teal-700 shadow-[0_18px_40px_-28px_rgba(15,118,110,0.85)]">
                <Compass className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/60 px-4 py-3">
                <div>
                  <p className="text-xs text-slate-500">Current stage</p>
                  <p className="font-medium text-slate-900">{leadCandidate?.currentStatus || "Service overview"}</p>
                </div>
                <Layers3 className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/60 px-4 py-3">
                <div>
                  <p className="text-xs text-slate-500">Payment standing</p>
                  <p className="font-medium text-slate-900">{leadCandidate?.paymentStatus || "No due milestone"}</p>
                </div>
                <CreditCard className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Candidate Portal Section */}
      {candidateCtx.context !== "empty" && (
        <div className="space-y-4">
          {/* Candidate Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {candidateCtx.offers.length > 0 && (
              <Link href="/customer/offers" className="block">
                <Card className="candidate-link-card border-sky-200/70 bg-sky-50/75">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="candidate-link-icon bg-sky-100 text-sky-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-sky-950">My Offers</p>
                      <p className="text-xs text-sky-700">{candidateCtx.offers.length} offer{candidateCtx.offers.length !== 1 ? "s" : ""}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-sky-500" />
                  </CardContent>
                </Card>
              </Link>
            )}
            {candidateCtx.candidates.length > 0 && candidateCtx.hasServices && (
              <Link href="/customer/timeline" className="block">
                <Card className="candidate-link-card border-teal-200/70 bg-teal-50/75">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="candidate-link-icon bg-teal-100 text-teal-700">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-teal-950">My Timeline</p>
                      <p className="text-xs text-teal-700">{candidateCtx.candidates.length} registration{candidateCtx.candidates.length !== 1 ? "s" : ""}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-teal-500" />
                  </CardContent>
                </Card>
              </Link>
            )}
            <Link href="/customer/messages" className="block">
              <Card className="candidate-link-card border-rose-200/70 bg-rose-50/75">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="candidate-link-icon bg-rose-100 text-rose-700">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-rose-950">Messages</p>
                    <p className="text-xs text-rose-700">Contact your partner</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-rose-500" />
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Offer-Only Banner */}
          {candidateCtx.context === "offer-only" && (
            <Card className="candidate-soft-panel border-amber-200/70 bg-amber-50/85">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 text-sm">You have pending offers</p>
                    <p className="text-xs text-amber-700 mt-1">
                      You have {candidateCtx.offers.length} offer{candidateCtx.offers.length !== 1 ? "s" : ""} waiting for your review.
                      Once you purchase a plan, you&apos;ll be able to track your full service timeline here.
                    </p>
                    <Link href="/customer/offers" className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-800 hover:text-amber-900">
                      View Offers <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Candidate Registrations */}
          {candidateCtx.candidates.length > 0 && candidateCtx.hasServices && (
            <Card className="candidate-soft-panel">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">My Registrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {candidateCtx.candidates.map((c) => (
                  <Link key={c.id} href={`/customer/timeline?candidateId=${c.id}`} className="block">
                    <div className="rounded-2xl border border-slate-200/80 bg-white/78 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-[0_18px_40px_-30px_rgba(15,118,110,0.65)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{c.sccgId}</p>
                          <p className="text-xs text-gray-500">{c.workflowCategory}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {c.currentStatus}
                          </Badge>
                          <Badge className={
                            c.paymentStatus === "fully-paid" ? "bg-green-100 text-green-800" :
                            c.paymentStatus === "deposit-paid" ? "bg-blue-100 text-blue-800" :
                            "bg-orange-100 text-orange-800"
                          }>
                            {c.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Link href="/customer/packages" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg">
        <Card className="candidate-soft-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Active Packages</CardTitle>
            <Package className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePackages}</div>
          </CardContent>
        </Card>
        </Link>
        <Link href="/customer/sessions?status=completed" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg">
        <Card className="candidate-soft-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Sessions Done</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedSessions}</div>
            <p className="text-xs text-gray-400">of {totalSessions}</p>
          </CardContent>
        </Card>
        </Link>
        <Link href="/customer/sessions?status=scheduled" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg">
        <Card className="candidate-soft-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{upcomingSessions}</div>
          </CardContent>
        </Card>
        </Link>
        <Link href="/customer/payments" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg">
        <Card className="candidate-soft-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{fmtBdt(totalOwed, rate, { compact: true })}</div>
          </CardContent>
        </Card>
        </Link>
        <Link href="/customer/notifications" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg">
        <Card className="candidate-soft-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-gray-500">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{unreadNotifications}</div>
            <p className="text-xs text-gray-400">unread</p>
          </CardContent>
        </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Package Status */}
        <Card className="candidate-soft-panel">
          <CardHeader>
            <CardTitle>My Packages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {packages.map((pkg) => {
              const progressPct = Math.round((pkg.completedSessions / pkg.totalSessions) * 100);
              return (
                <div key={pkg.id} className="rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">
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
        <Card className="candidate-soft-panel">
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
        <Card className="candidate-soft-panel border-teal-200/70 bg-teal-50/85">
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
