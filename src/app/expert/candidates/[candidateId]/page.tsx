import { redirect, notFound } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import { getCustomerPackages, getSessionsByExpert } from "@/lib/sharepoint";
import type { SessionUser, Session } from "@/types";
import Link from "next/link";
import {
  ArrowLeft,
  UserSquare,
  Package,
  CheckCircle2,
  Clock,
  CalendarDays,
  Video,
  ExternalLink,
  Star,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ candidateId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { candidateId } = await params;
  return { title: `Candidate ${candidateId} | Expert Portal` };
}

const statusBadgeStyles: Record<Session["status"], string> = {
  completed:
    "text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  scheduled:
    "text-blue-700 dark:text-blue-400 border-blue-500/30 bg-blue-500/10",
  pending:
    "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
  rescheduled:
    "text-yellow-700 dark:text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  cancelled:
    "text-rose-700 dark:text-rose-400 border-rose-500/30 bg-rose-500/10",
};

export default async function ExpertCandidateDetailPage({ params }: Props) {
  const { candidateId } = await params;
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/expert-login");
  const user = session.user as SessionUser;

  const [allPackages, allSessions] = await Promise.all([
    getCustomerPackages(undefined, undefined, user.id),
    getSessionsByExpert(user.id),
  ]);

  const myPackages = allPackages.filter(
    (p) => p.expertId === user.id && p.customerId === candidateId
  );
  if (myPackages.length === 0) notFound();

  const candidateName = myPackages[0]?.customerName || candidateId;
  const candidateSessions = allSessions.filter(
    (s) =>
      s.customerId === candidateId ||
      myPackages.some((p) => p.id === s.customerPackageId)
  );

  const completedSessions = candidateSessions.filter((s) => s.status === "completed");
  const scheduledSessions = candidateSessions.filter((s) => s.status === "scheduled");
  const pendingSessions = candidateSessions.filter((s) => s.status === "pending");

  // Track sessions allocated to specific packages
  const mappedSessionIds = new Set<string>();

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top back navigation */}
      <div>
        <Link
          href="/expert/candidates"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to My Candidates
        </Link>
      </div>

      {/* Candidate Profile Overview */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl uppercase shrink-0 ring-4 ring-primary/5">
            {candidateName.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{candidateName}</h1>
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
                <UserSquare className="h-3.5 w-3.5 mr-1" />
                Candidate ID: {candidateId}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enrolled in {myPackages.length} package{myPackages.length !== 1 ? "s" : ""} with you
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 text-sm">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>{completedSessions.length} Completed</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">
            <CalendarDays className="h-4 w-4" />
            <span>{scheduledSessions.length} Upcoming</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
            <Clock className="h-4 w-4" />
            <span>{pendingSessions.length} Pending</span>
          </div>
        </div>
      </div>

      {/* Packages and their Associated Sessions */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Purchased Plans &amp; Sessions
          </h2>
          <span className="text-xs text-muted-foreground">
            All sessions organized per purchased package
          </span>
        </div>

        <div className="space-y-6">
          {myPackages.map((pkg) => {
            // Find sessions for this package
            let planSessions = candidateSessions.filter(
              (s) => s.customerPackageId === pkg.id
            );

            // Fallback: if only 1 package exists and some sessions have no pkg ID
            if (myPackages.length === 1 && planSessions.length === 0) {
              planSessions = candidateSessions;
            }

            // Mark mapped
            planSessions.forEach((s) => mappedSessionIds.add(s.id));

            // Sort by sessionNumber ascending
            planSessions.sort((a, b) => a.sessionNumber - b.sessionNumber);

            const pct =
              pkg.totalSessions > 0
                ? Math.round((pkg.completedSessions / pkg.totalSessions) * 100)
                : 0;
            const remaining = Math.max(0, pkg.totalSessions - pkg.completedSessions);

            // Calculate placeholders for sessions not yet scheduled in the system
            const maxSessionNum = planSessions.reduce(
              (max, s) => Math.max(max, s.sessionNumber || 0),
              0
            );
            const totalToDisplay = Math.max(pkg.totalSessions, maxSessionNum);
            const scheduledNumbers = new Set(planSessions.map((s) => s.sessionNumber));
            const unscheduledSlots: number[] = [];
            for (let num = 1; num <= totalToDisplay; num++) {
              if (!scheduledNumbers.has(num)) {
                unscheduledSlots.push(num);
              }
            }

            return (
              <div
                key={pkg.id}
                className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
              >
                {/* Package Header Card */}
                <div className="p-6 border-b border-border bg-muted/20 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-bold text-foreground">
                          {pkg.packageName}
                        </h3>
                        <Badge
                          variant="outline"
                          className={
                            pkg.status === "active"
                              ? "text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-semibold"
                              : pkg.status === "completed"
                              ? "text-muted-foreground border-border bg-muted/40"
                              : "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 font-semibold"
                          }
                        >
                          {pkg.status.toUpperCase()}
                        </Badge>
                      </div>
                      {pkg.startDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Started: {new Date(pkg.startDate).toLocaleDateString("en-GB")}
                          {pkg.endDate &&
                            ` · Valid until: ${new Date(pkg.endDate).toLocaleDateString("en-GB")}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <p className="font-bold text-foreground text-sm">
                          {pkg.completedSessions} / {pkg.totalSessions}
                        </p>
                        <p className="text-muted-foreground">Sessions Completed</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <span>Plan Completion</span>
                      <span>{pct}% ({remaining} remaining)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Plan Sessions List */}
                <div className="p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Session Details for {pkg.packageName}
                  </h4>

                  {planSessions.length === 0 && unscheduledSlots.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                      No sessions recorded for this plan yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {planSessions.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-xl border border-border bg-background/50 hover:bg-background/80 p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          {/* Left: Session Number & Timing */}
                          <div className="space-y-1 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm">
                                Session {s.sessionNumber}
                                {s.totalSessions ? ` of ${s.totalSessions}` : ""}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-semibold uppercase ${
                                  statusBadgeStyles[s.status] || "border-border text-muted-foreground"
                                }`}
                              >
                                {s.status}
                              </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {s.scheduledAt ? (
                                <span>
                                  {new Date(s.scheduledAt).toLocaleDateString("en-GB", {
                                    weekday: "short",
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}{" "}
                                  at{" "}
                                  {new Date(s.scheduledAt).toLocaleTimeString("en-GB", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              ) : s.completedAt ? (
                                <span>
                                  Completed on {new Date(s.completedAt).toLocaleDateString("en-GB")}
                                </span>
                              ) : (
                                <span>Date TBD</span>
                              )}
                              {s.durationMinutes ? ` · ${s.durationMinutes} mins` : ""}
                            </p>
                          </div>

                          {/* Middle: Notes & Details */}
                          <div className="flex-1 min-w-0 space-y-1 text-xs">
                            {s.notes && (
                              <p className="text-muted-foreground line-clamp-2">
                                <span className="font-medium text-foreground">Agenda/Notes: </span>
                                {s.notes}
                              </p>
                            )}
                            {s.expertNotes && (
                              <p className="text-primary/90 bg-primary/5 px-2.5 py-1 rounded-md border border-primary/10 line-clamp-1 italic">
                                <span className="font-semibold not-italic">Internal Notes: </span>
                                {s.expertNotes}
                              </p>
                            )}
                            {s.customerRating && (
                              <div className="flex items-center gap-1 text-amber-500 font-medium">
                                <Star className="h-3.5 w-3.5 fill-current" />
                                <span>{s.customerRating} / 5 Candidate Rating</span>
                              </div>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                            {s.meetingUrl && s.status === "scheduled" && (
                              <a
                                href={s.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
                              >
                                <Video className="h-3.5 w-3.5" />
                                Join Call
                              </a>
                            )}

                            <Link
                              href={`/expert/sessions/${s.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/60 text-foreground text-xs font-semibold transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              {s.status === "scheduled"
                                ? "Complete Session"
                                : s.status === "completed"
                                ? "View Record"
                                : "Session Details"}
                            </Link>
                          </div>
                        </div>
                      ))}

                      {/* Unscheduled / Future slots in the purchased package */}
                      {unscheduledSlots.map((num) => (
                        <div
                          key={`unscheduled-${num}`}
                          className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-4 flex items-center justify-between gap-4 text-xs text-muted-foreground"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                            <span className="font-medium text-foreground">
                              Session {num} of {pkg.totalSessions}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold uppercase">
                              Not yet scheduled
                            </span>
                          </div>
                          <span className="text-[11px] italic">
                            Awaiting appointment booking
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Any remaining sessions not mapped to a specific package */}
          {candidateSessions.filter((s) => !mappedSessionIds.has(s.id)).length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Additional Sessions
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {candidateSessions
                  .filter((s) => !mappedSessionIds.has(s.id))
                  .map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-border bg-background/50 p-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Session {s.sessionNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Status: {s.status}
                          {s.scheduledAt && ` · ${new Date(s.scheduledAt).toLocaleDateString("en-GB")}`}
                        </p>
                      </div>
                      <Link
                        href={`/expert/sessions/${s.id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        View Session
                      </Link>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}