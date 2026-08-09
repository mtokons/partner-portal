"use client";

import { useMemo, useState } from "react";
import { Search, ExternalLink, Users, CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";
import type { Expert, Session, SessionStatus } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  rescheduled: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const STATUS_FILTERS: (SessionStatus | "all")[] = ["all", "pending", "scheduled", "completed", "cancelled", "rescheduled"];

export default function SessionOverviewClient({ sessions, experts }: { sessions: Session[]; experts: Expert[] }) {
  const [query, setQuery] = useState("");
  const [expertFilter, setExpertFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .filter((s) => (expertFilter ? s.expertId === expertFilter : true))
      .filter((s) => (statusFilter === "all" ? true : s.status === statusFilter))
      .filter((s) => (q ? s.customerName?.toLowerCase().includes(q) || s.expertName?.toLowerCase().includes(q) : true))
      .sort((a, b) => new Date(b.scheduledAt || b.createdAt).getTime() - new Date(a.scheduledAt || a.createdAt).getTime());
  }, [sessions, query, expertFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: filtered.length,
      completed: filtered.filter((s) => s.status === "completed").length,
      scheduled: filtered.filter((s) => s.status === "scheduled").length,
      pending: filtered.filter((s) => s.status === "pending").length,
      cancelled: filtered.filter((s) => s.status === "cancelled").length,
    };
  }, [filtered]);

  const cards = [
    { label: "Total Sessions", value: stats.total, icon: Users, color: "text-foreground" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Scheduled", value: stats.scheduled, icon: RefreshCw, color: "text-blue-600 dark:text-blue-400" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-gray-600 dark:text-gray-400" },
    { label: "Cancelled", value: stats.cancelled, icon: XCircle, color: "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
              {c.label}
            </div>
            <p className={`mt-1 text-xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by client or expert..."
            className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={expertFilter}
          onChange={(e) => setExpertFilter(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Experts</option>
          {experts.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SessionStatus | "all")}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm capitalize"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s === "all" ? "All Statuses" : s}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
              <th className="py-2 px-3">Client</th>
              <th className="py-2 px-3">Expert</th>
              <th className="py-2 px-3">Session</th>
              <th className="py-2 px-3">Scheduled</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Meeting</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{s.customerName || "—"}</td>
                <td className="py-2 px-3">{s.expertName || "Unassigned"}</td>
                <td className="py-2 px-3">
                  #{s.sessionNumber} / {s.totalSessions}
                </td>
                <td className="py-2 px-3">{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString("en-GB") : "TBD"}</td>
                <td className="py-2 px-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${STATUS_COLORS[s.status] || STATUS_COLORS.pending}`}>
                    {s.status}
                  </span>
                </td>
                <td className="py-2 px-3">
                  {s.meetingUrl ? (
                    <a
                      href={s.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Join <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No sessions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
