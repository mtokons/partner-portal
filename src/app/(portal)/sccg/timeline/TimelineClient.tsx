"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search, Printer, Calendar, User } from "lucide-react";
import type { CustomerPackage, Session } from "@/types";
import type { TimelineCustomer } from "./actions";
import { fetchCustomerTimelineAction } from "./actions";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  rescheduled: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function weekAndMonthFor(session: Session, pkg: CustomerPackage): { week: number; month: string; estimated: boolean } {
  const start = pkg.startDate ? new Date(pkg.startDate) : null;
  if (session.scheduledAt && start) {
    const scheduled = new Date(session.scheduledAt);
    const week = Math.max(1, Math.floor((scheduled.getTime() - start.getTime()) / MS_PER_WEEK) + 1);
    return { week, month: scheduled.toLocaleString("en-GB", { month: "long", year: "numeric" }), estimated: false };
  }
  if (start && pkg.totalSessions > 0) {
    const totalDays = pkg.endDate ? (new Date(pkg.endDate).getTime() - start.getTime()) / (24 * 60 * 60 * 1000) : pkg.totalSessions * 7;
    const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
    const week = Math.max(1, Math.round((session.sessionNumber / pkg.totalSessions) * totalWeeks));
    const estDate = new Date(start.getTime() + (week - 1) * MS_PER_WEEK);
    return { week, month: estDate.toLocaleString("en-GB", { month: "long", year: "numeric" }), estimated: true };
  }
  return { week: session.sessionNumber, month: "—", estimated: true };
}

export default function TimelineClient({ customers }: { customers: TimelineCustomer[] }) {
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [packages, setPackages] = useState<(CustomerPackage & { sessions: Session[] })[]>([]);
  const [activePackageId, setActivePackageId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  const customer = useMemo(() => customers.find((c) => c.id === customerId) || null, [customers, customerId]);
  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 50);
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)).slice(0, 50);
  }, [customers, query]);

  const activePackage = useMemo(() => packages.find((p) => p.id === activePackageId) || packages[0] || null, [packages, activePackageId]);

  useEffect(() => {
    if (!customerId) {
      setPackages([]);
      return;
    }
    setLoading(true);
    startTransition(async () => {
      const res = await fetchCustomerTimelineAction(customerId);
      const pkgs = res.success && res.data ? res.data.packages : [];
      setPackages(pkgs);
      setActivePackageId(pkgs[0]?.id || "");
      setLoading(false);
    });
  }, [customerId]);

  const timelineRows = useMemo(() => {
    if (!activePackage) return [];
    return [...activePackage.sessions]
      .sort((a, b) => a.sessionNumber - b.sessionNumber)
      .map((s) => ({ session: s, ...weekAndMonthFor(s, activePackage) }));
  }, [activePackage]);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4 print:hidden">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Select Client</h2>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            size={10}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            {filteredCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.email}
              </option>
            ))}
          </select>
        </div>

        {packages.length > 1 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Select Plan</h2>
            <select
              value={activePackageId}
              onChange={(e) => setActivePackageId(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            >
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.packageName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {!customer ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Select a client to generate their service timeline.
          </div>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading timeline…</p>
        ) : !activePackage ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {customer.name} has no active service package yet.
          </div>
        ) : (
          <div id="timeline-template" className="rounded-xl border border-border bg-card p-6 space-y-6 print:border-0 print:shadow-none">
            <div className="flex items-start justify-between gap-3 print:hidden">
              <h2 className="text-lg font-bold text-foreground">Client Service Timeline</h2>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-medium hover:bg-primary/90"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Export
              </button>
            </div>

            {/* Name / Contact / ID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-b border-border pb-4">
              <div>
                <p className="text-xs text-muted-foreground">Client Name</p>
                <p className="font-semibold">{customer.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contact</p>
                <p className="font-medium">{customer.email}</p>
                <p className="text-xs text-muted-foreground">{customer.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Client ID</p>
                <p className="font-medium">{customer.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="font-medium">{customer.company || "—"}</p>
              </div>
            </div>

            {/* Plan */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-b border-border pb-4">
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="font-semibold">{activePackage.packageName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sessions</p>
                <p className="font-medium">{activePackage.completedSessions} / {activePackage.totalSessions}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-medium">
                  {activePackage.startDate ? new Date(activePackage.startDate).toLocaleDateString("en-GB") : "—"} –{" "}
                  {activePackage.endDate ? new Date(activePackage.endDate).toLocaleDateString("en-GB") : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned Expert</p>
                <p className="font-medium flex items-center gap-1"><User className="w-3.5 h-3.5" />{activePackage.expertName || "Not assigned"}</p>
              </div>
            </div>

            {/* Week/Month timeline */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Week / Month Timeline
              </h3>
              {timelineRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sessions scheduled yet for this plan.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-1.5 pr-2">Session</th>
                      <th className="py-1.5 pr-2">Week</th>
                      <th className="py-1.5 pr-2">Month</th>
                      <th className="py-1.5 pr-2">Date</th>
                      <th className="py-1.5 pr-2">Expert</th>
                      <th className="py-1.5 pr-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timelineRows.map(({ session, week, month, estimated }) => (
                      <tr key={session.id} className="border-b border-border/50">
                        <td className="py-1.5 pr-2">#{session.sessionNumber}</td>
                        <td className="py-1.5 pr-2">Week {week}{estimated ? " (est.)" : ""}</td>
                        <td className="py-1.5 pr-2">{month}</td>
                        <td className="py-1.5 pr-2">
                          {session.scheduledAt ? new Date(session.scheduledAt).toLocaleDateString("en-GB") : "TBD"}
                        </td>
                        <td className="py-1.5 pr-2">{session.expertName || "—"}</td>
                        <td className="py-1.5 pr-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${STATUS_COLORS[session.status] || STATUS_COLORS.pending}`}>
                            {session.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Remarks */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Remarks</h3>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                placeholder="Add remarks for this client's service plan (included when printed)…"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm print:border-none print:p-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
