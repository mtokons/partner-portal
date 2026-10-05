"use client";

import React, { useState, useMemo, useTransition } from "react";
import type { ActivityLog } from "@/types";
import type { ActivitySummaryStats } from "@/app/actions/activity-logs";
import { fetchAllUserActivities } from "@/app/actions/activity-logs";
import {
  Activity,
  Search,
  RefreshCw,
  Download,
  Users,
  LogIn,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Trash2,
  UserPlus,
  Clock,
  Laptop,
  Globe,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  ExternalLink,
  Shield,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  initialLogs: ActivityLog[];
  initialStats: ActivitySummaryStats;
  currentAdminEmail?: string;
}

// Action badge visual styling
function getActionBadge(action: string) {
  switch (action) {
    case "login":
      return {
        label: "Sign In",
        icon: LogIn,
        className: "bg-emerald-50 text-emerald-700 border-emerald-300",
      };
    case "logout":
      return {
        label: "Sign Out",
        icon: LogOut,
        className: "bg-slate-100 text-slate-700 border-slate-300",
      };
    case "impersonate_start":
      return {
        label: "Impersonate Start",
        icon: Eye,
        className: "bg-amber-50 text-amber-800 border-amber-300",
      };
    case "impersonate_stop":
      return {
        label: "Impersonate Stop",
        icon: Eye,
        className: "bg-orange-50 text-orange-800 border-orange-300",
      };
    case "user_delete":
      return {
        label: "User Delete",
        icon: Trash2,
        className: "bg-rose-50 text-rose-700 border-rose-300",
      };
    case "user_create":
      return {
        label: "User Created",
        icon: UserPlus,
        className: "bg-blue-50 text-blue-700 border-blue-300",
      };
    case "user_update":
    case "role_change":
      return {
        label: action === "role_change" ? "Role Change" : "User Update",
        icon: ShieldAlert,
        className: "bg-purple-50 text-purple-700 border-purple-300",
      };
    case "partner_approve":
      return {
        label: "Partner Approved",
        icon: CheckCircle2,
        className: "bg-emerald-50 text-emerald-700 border-emerald-300",
      };
    case "partner_reject":
      return {
        label: "Partner Rejected",
        icon: AlertCircle,
        className: "bg-rose-50 text-rose-700 border-rose-300",
      };
    default:
      return {
        label: action.replace(/_/g, " "),
        icon: Activity,
        className: "bg-indigo-50 text-indigo-700 border-indigo-300",
      };
  }
}

// Role badge styling
function getRoleBadgeColor(role?: string) {
  const r = (role || "").toLowerCase();
  if (r.includes("admin")) return "bg-rose-50 text-rose-700 border-rose-300 font-semibold";
  if (r.includes("partner")) return "bg-blue-50 text-blue-700 border-blue-300 font-semibold";
  if (r.includes("expert") || r.includes("teacher")) return "bg-purple-50 text-purple-700 border-purple-300 font-semibold";
  if (r.includes("customer")) return "bg-amber-50 text-amber-800 border-amber-300 font-semibold";
  if (r.includes("student") || r.includes("seeker")) return "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold";
  return "bg-slate-100 text-slate-700 border-slate-300";
}

// Device/Browser parser
function formatUserAgent(ua?: string): string {
  if (!ua) return "Direct API / System";
  if (ua.includes("Edg/")) return "Microsoft Edge";
  if (ua.includes("Chrome/")) return "Google Chrome";
  if (ua.includes("Firefox/")) return "Mozilla Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Apple Safari";
  if (ua.includes("Postman") || ua.includes("curl") || ua.includes("Node")) return "API Client";
  if (ua.length > 30) return ua.slice(0, 30) + "...";
  return ua;
}

// Time formatting helper
function formatTimeAgo(isoString?: string): string {
  if (!isoString) return "Unknown";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 0) return "Just now";
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString();
  } catch {
    return isoString;
  }
}

export default function ActivityLogClient({
  initialLogs,
  initialStats,
  currentAdminEmail,
}: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [stats, setStats] = useState<ActivitySummaryStats>(initialStats);
  const [isPending, startTransition] = useTransition();

  // Filter States
  const [search, setSearch] = useState("");
  const [actionCategory, setActionCategory] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "feed">("table");

  // Selected Log for Inspector Modal
  const [inspectLog, setInspectLog] = useState<ActivityLog | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 35;

  // Refresh handler
  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const res = await fetchAllUserActivities();
        setLogs(res.logs);
        setStats(res.stats);
      } catch (err) {
        console.error("Failed to refresh activity logs", err);
      }
    });
  };

  // Filter logic
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      // 1. Text Search
      if (query) {
        const match =
          log.actorEmail?.toLowerCase().includes(query) ||
          log.actorName?.toLowerCase().includes(query) ||
          log.description?.toLowerCase().includes(query) ||
          log.action?.toLowerCase().includes(query) ||
          log.targetEmail?.toLowerCase().includes(query) ||
          log.targetName?.toLowerCase().includes(query) ||
          log.ipAddress?.toLowerCase().includes(query) ||
          log.console?.toLowerCase().includes(query);
        if (!match) return false;
      }

      // 2. Action Category Filter
      if (actionCategory !== "all") {
        if (actionCategory === "login" && log.action !== "login") return false;
        if (actionCategory === "logout" && log.action !== "logout") return false;
        if (
          actionCategory === "impersonate" &&
          log.action !== "impersonate_start" &&
          log.action !== "impersonate_stop"
        )
          return false;
        if (
          actionCategory === "user_mgmt" &&
          !["user_create", "user_update", "user_delete", "role_change"].includes(
            log.action
          )
        )
          return false;
        if (
          actionCategory === "projects" &&
          !log.action.startsWith("project_") &&
          !log.action.startsWith("candidate_")
        )
          return false;
      }

      // 3. Role Filter
      if (roleFilter !== "all") {
        const actorRole = (log.actorRole || "").toLowerCase();
        if (roleFilter === "admin" && !actorRole.includes("admin")) return false;
        if (roleFilter === "partner" && !actorRole.includes("partner")) return false;
        if (
          roleFilter === "expert" &&
          !actorRole.includes("expert") &&
          !actorRole.includes("teacher")
        )
          return false;
        if (roleFilter === "customer" && !actorRole.includes("customer")) return false;
        if (
          roleFilter === "student" &&
          !actorRole.includes("student") &&
          !actorRole.includes("seeker")
        )
          return false;
      }

      // 4. Time Filter
      if (timeFilter !== "all" && log.createdAt) {
        const logTime = new Date(log.createdAt).getTime();
        const diffHours = (now - logTime) / (1000 * 60 * 60);
        if (timeFilter === "today" && diffHours > 24) return false;
        if (timeFilter === "7days" && diffHours > 24 * 7) return false;
        if (timeFilter === "30days" && diffHours > 24 * 30) return false;
      }

      return true;
    });
  }, [logs, search, actionCategory, roleFilter, timeFilter]);

  // Paginated View
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const pagedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [search, actionCategory, roleFilter, timeFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredLogs.length) return;
    const headers = [
      "Timestamp",
      "Actor Email",
      "Actor Name",
      "Actor Role",
      "Action",
      "Description",
      "Target Email",
      "Target Name",
      "Console",
      "IP Address",
      "User Agent",
    ];

    const rows = filteredLogs.map((item) => [
      `"${item.createdAt || ""}"`,
      `"${item.actorEmail || ""}"`,
      `"${item.actorName || ""}"`,
      `"${item.actorRole || ""}"`,
      `"${item.action || ""}"`,
      `"${(item.description || "").replace(/"/g, '""')}"`,
      `"${item.targetEmail || ""}"`,
      `"${item.targetName || ""}"`,
      `"${item.console || ""}"`,
      `"${item.ipAddress || ""}"`,
      `"${(item.userAgent || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `sccg-activity-logs-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Multi-Color Accent Ribbon ─────────────────── */}
      <div className="h-1 w-full bg-gradient-to-r from-[#111827] via-[#0F4C81] via-[#DC2626] to-[#F59E0B] rounded-full shadow-sm" />

      {/* ── Top Header & Actions ───────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0F4C81] shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                All User Activity & Audit Log
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0F4C81] border border-blue-200">
                  Live Audit Feed
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                Audited access log tracking user authentications, impersonation sessions, and operations across consoles.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!filteredLogs.length}
            className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── KPI Stat Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Total Activities
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Recorded in audit storage</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Unique Actors
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.uniqueActors}</p>
              <p className="text-xs text-slate-500 mt-0.5">Active users on record</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0F4C81]">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Logins Today
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.loginsToday}</p>
              <p className="text-xs text-slate-500 mt-0.5">Successful authentications</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <LogIn className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Admin Operations
              </p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {stats.adminActionsCount}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Impersonation & management</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Controls ─────────────────────── */}
      <Card className="border-slate-200/90 bg-white shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search user, email, action, IP, target..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-9 rounded-lg focus:bg-white focus:border-[#0F4C81]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Action Filter */}
              <select
                value={actionCategory}
                onChange={(e) => setActionCategory(e.target.value)}
                aria-label="Filter by action category"
                className="h-9 px-3 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-[#0F4C81]"
              >
                <option value="all">All Actions</option>
                <option value="login">Sign Ins Only</option>
                <option value="logout">Sign Outs Only</option>
                <option value="impersonate">Impersonations</option>
                <option value="user_mgmt">User Management</option>
                <option value="projects">Projects & Candidates</option>
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by actor role"
                className="h-9 px-3 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-[#0F4C81]"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="partner">Partner</option>
                <option value="expert">Expert / Teacher</option>
                <option value="customer">Customer</option>
                <option value="student">Student / Seeker</option>
              </select>

              {/* Timeframe Filter */}
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                aria-label="Filter by timeframe"
                className="h-9 px-3 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-[#0F4C81]"
              >
                <option value="all">All Time</option>
                <option value="today">Today (24h)</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>

              {/* View Switcher */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 ml-auto">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                    viewMode === "table"
                      ? "bg-[#0F4C81] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode("feed")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                    viewMode === "feed"
                      ? "bg-[#0F4C81] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Timeline
                </button>
              </div>
            </div>
          </div>

          {/* Active filter count banner */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>
              Showing{" "}
              <strong className="text-slate-900 font-semibold">{filteredLogs.length}</strong>{" "}
              of {logs.length} activities
              {(search || actionCategory !== "all" || roleFilter !== "all" || timeFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setActionCategory("all");
                    setRoleFilter("all");
                    setTimeFilter("all");
                  }}
                  className="ml-2 text-[#0F4C81] hover:underline font-medium"
                >
                  Clear all filters
                </button>
              )}
            </span>

            <span>
              Page {page} of {totalPages}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Table View ─────────────────────────────────── */}
      {viewMode === "table" && (
        <Card className="border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User / Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Activity Description</th>
                  <th className="py-3 px-4">Console</th>
                  <th className="py-3 px-4">Client IP / Device</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedLogs.map((item) => {
                  const badge = getActionBadge(item.action);
                  const BadgeIcon = badge.icon;
                  const isCurrentAdmin =
                    currentAdminEmail &&
                    item.actorEmail?.toLowerCase() === currentAdminEmail.toLowerCase();

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setInspectLog(item)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span title={item.createdAt}>
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "—"}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-700">
                            {item.actorEmail ? item.actorEmail.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {item.actorName || item.actorEmail?.split("@")[0] || "Unknown User"}
                              {isCurrentAdmin && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-[#0F4C81] border border-blue-200 font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.actorEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`flex items-center gap-1 w-fit font-medium text-[11px] py-0.5 px-2 ${badge.className}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </Badge>
                      </td>

                      {/* Description & Target */}
                      <td className="py-3 px-4 max-w-xs md:max-w-md">
                        <p className="text-slate-800 truncate">{item.description}</p>
                        {(item.targetEmail || item.targetName) && (
                          <p className="text-[11px] text-[#0F4C81] font-medium mt-0.5 truncate">
                            Target: {item.targetName || item.targetEmail}
                          </p>
                        )}
                      </td>

                      {/* Console / Role */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          {item.console && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                              {item.console}
                            </span>
                          )}
                          {item.actorRole && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${getRoleBadgeColor(
                                item.actorRole
                              )}`}
                            >
                              {item.actorRole}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* IP & Device */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-600 text-[11px]">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>{item.ipAddress || "—"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-0.5">
                          <Laptop className="w-3 h-3" />
                          <span title={item.userAgent}>
                            {formatUserAgent(item.userAgent)}
                          </span>
                        </div>
                      </td>

                      {/* Details button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectLog(item);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Activity className="w-8 h-8 text-slate-400" />
                        <p className="font-semibold text-slate-700">No activity events found</p>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Try adjusting your search keywords, role filters, or selected timeframe.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/70 text-xs">
              <span className="text-slate-500">
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, filteredLogs.length)} of {filteredLogs.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </Button>
                <span className="text-slate-600 px-2 font-medium">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Timeline Feed View ──────────────────────────── */}
      {viewMode === "feed" && (
        <div className="space-y-3">
          {pagedLogs.map((item) => {
            const badge = getActionBadge(item.action);
            const BadgeIcon = badge.icon;

            return (
              <Card
                key={item.id}
                onClick={() => setInspectLog(item)}
                className="border-slate-200/90 bg-white hover:bg-slate-50/60 shadow-sm transition-all cursor-pointer p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-[#0F4C81]">
                      <BadgeIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          {item.actorName || item.actorEmail?.split("@")[0] || "User"}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({item.actorEmail})
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-2 ${badge.className}`}
                        >
                          {badge.label}
                        </Badge>
                        {item.actorRole && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${getRoleBadgeColor(
                              item.actorRole
                            )}`}
                          >
                            {item.actorRole}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 mt-1">
                        {item.description}
                      </p>
                      {(item.targetEmail || item.targetName) && (
                        <p className="text-xs text-[#0F4C81] font-medium mt-0.5">
                          Target: {item.targetName || item.targetEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <div className="flex items-center sm:justify-end gap-1.5 text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatTimeAgo(item.createdAt)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                    </div>
                    {item.ipAddress && (
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        IP: {item.ipAddress}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {filteredLogs.length === 0 && (
            <Card className="border-slate-200/90 bg-white p-8 text-center text-slate-500 shadow-sm">
              <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No activity events found</p>
            </Card>
          )}

          {/* Feed Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Inspection Modal / Drawer ───────────────────── */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0F4C81]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Audit Event Details
                  </h3>
                  <p className="text-xs text-slate-500">ID: {inspectLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                    Actor
                  </span>
                  <p className="text-slate-900 font-semibold mt-0.5">
                    {inspectLog.actorName || "—"}
                  </p>
                  <p className="text-slate-600">{inspectLog.actorEmail}</p>
                  {inspectLog.actorRole && (
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {inspectLog.actorRole}
                    </Badge>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                    Action Type
                  </span>
                  <p className="text-slate-900 font-semibold mt-0.5">
                    {inspectLog.action}
                  </p>
                  {inspectLog.console && (
                    <p className="text-slate-600 mt-0.5">
                      Console: {inspectLog.console}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                  Event Summary
                </span>
                <p className="text-slate-800 font-medium mt-1 text-sm">
                  {inspectLog.description}
                </p>
              </div>

              {(inspectLog.targetEmail || inspectLog.targetName || inspectLog.targetId) && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                    Target Information
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {inspectLog.targetEmail && (
                      <p className="text-slate-700">
                        Email: <strong>{inspectLog.targetEmail}</strong>
                      </p>
                    )}
                    {inspectLog.targetName && (
                      <p className="text-slate-700">
                        Name: <strong>{inspectLog.targetName}</strong>
                      </p>
                    )}
                    {inspectLog.targetId && (
                      <p className="text-slate-500 font-mono text-[11px]">
                        ID: {inspectLog.targetId}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                    Network IP
                  </span>
                  <p className="text-slate-700 font-mono mt-0.5">
                    {inspectLog.ipAddress || "Not captured"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                    Timestamp
                  </span>
                  <p className="text-slate-700 mt-0.5 font-medium">
                    {inspectLog.createdAt
                      ? new Date(inspectLog.createdAt).toLocaleString()
                      : "—"}
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    {inspectLog.createdAt}
                  </p>
                </div>
              </div>

              {inspectLog.userAgent && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                    Client User Agent
                  </span>
                  <p className="text-slate-600 font-mono text-[11px] mt-1 break-all">
                    {inspectLog.userAgent}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectLog(null)}
                className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
