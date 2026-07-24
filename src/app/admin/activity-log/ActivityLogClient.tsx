"use client";

import { useMemo, useState } from "react";
import {
  ScrollText, Search, RefreshCw, LogIn, LogOut, Eye, EyeOff,
  UserPlus, UserCog, UserMinus, CheckCircle2, XCircle, Activity as ActivityIcon, Loader2,
} from "lucide-react";
import { fetchActivityLogsAction } from "./actions";
import type { ActivityLog } from "@/types";

const ACTION_META: Record<string, { label: string; className: string; Icon: any }> = {
  login: { label: "Login", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", Icon: LogIn },
  logout: { label: "Logout", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", Icon: LogOut },
  impersonate_start: { label: "View As (start)", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", Icon: Eye },
  impersonate_stop: { label: "View As (stop)", className: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300", Icon: EyeOff },
  user_create: { label: "User Created", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", Icon: UserPlus },
  user_update: { label: "User Updated", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", Icon: UserCog },
  user_delete: { label: "User Deleted", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", Icon: UserMinus },
  partner_approve: { label: "Partner Approved", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", Icon: CheckCircle2 },
  partner_reject: { label: "Partner Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", Icon: XCircle },
  other: { label: "Other", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", Icon: ActivityIcon },
};

function actionMeta(action: string) {
  return ACTION_META[action] || ACTION_META.other;
}

function formatTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function ActivityLogClient({ initialLogs }: { initialLogs: ActivityLog[] }) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Distinct actors for the user dropdown (label = name <email>, value = email)
  const actors = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of logs) {
      if (l.actorEmail && !map.has(l.actorEmail)) {
        map.set(l.actorEmail, l.actorName ? `${l.actorName} (${l.actorEmail})` : l.actorEmail);
      }
    }
    return Array.from(map.entries())
      .map(([email, label]) => ({ email, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [logs]);

  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) if (l.action) set.add(l.action);
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return logs.filter((l) => {
      if (userFilter !== "all" && l.actorEmail !== userFilter) return false;
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (!s) return true;
      return (
        l.actorEmail?.toLowerCase().includes(s) ||
        l.actorName?.toLowerCase().includes(s) ||
        l.description?.toLowerCase().includes(s) ||
        l.targetEmail?.toLowerCase().includes(s) ||
        l.targetName?.toLowerCase().includes(s) ||
        l.action?.toLowerCase().includes(s) ||
        l.ipAddress?.toLowerCase().includes(s)
      );
    });
  }, [logs, search, userFilter, actionFilter]);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetchActivityLogsAction({
        actorEmail: userFilter !== "all" ? userFilter : undefined,
        limit: 500,
      });
      if (res.success && res.data) setLogs(res.data);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm">
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
            <p className="text-sm text-muted-foreground">Audit trail of who did what and when — logins, logouts, impersonation and key changes.</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search description, user, target, IP…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="w-full md:w-auto px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          aria-label="Filter by user"
        >
          <option value="all">All users</option>
          {actors.map((a) => (
            <option key={a.email} value={a.email}>{a.label}</option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full md:w-auto px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          aria-label="Filter by action"
        >
          <option value="all">All actions</option>
          {actionTypes.map((a) => (
            <option key={a} value={a}>{actionMeta(a).label}</option>
          ))}
        </select>

        <span className="text-sm text-muted-foreground md:ml-auto">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">When</th>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Details</th>
                <th className="px-5 py-3 font-semibold">Target</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No activity recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const meta = actionMeta(log.action);
                  const Icon = meta.Icon;
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">{formatTime(log.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium">{log.actorName || log.actorEmail || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{log.actorEmail}{log.actorRole ? ` · ${log.actorRole}` : ""}</div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.className}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-md">{log.description || "—"}</td>
                      <td className="px-5 py-3">
                        {log.targetEmail || log.targetName ? (
                          <div>
                            <div className="font-medium">{log.targetName || log.targetEmail}</div>
                            {log.targetName && log.targetEmail && (
                              <div className="text-xs text-muted-foreground">{log.targetEmail}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">{log.ipAddress || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
