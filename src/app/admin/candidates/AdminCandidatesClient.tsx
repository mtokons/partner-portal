"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Users, Search, Filter, X, UserPlus, ChevronDown } from "lucide-react";
import { formatStatusLabel } from "@/lib/engine/candidate-workflow";

interface CandidateRow {
  id: string;
  fullName: string;
  sccgId: string;
  email: string;
  partnerId: string;
  partnerName?: string;
  workflowCategory: string;
  currentStatus: string;
  totalServiceFee: number;
  isOnHold?: boolean;
  createdAt?: string;
}

interface PartnerOption {
  id: string;
  name: string;
}

interface Props {
  candidates: CandidateRow[];
  partners: PartnerOption[];
  allStatuses: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "Training & Language": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Ausbildung: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "Student": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Opportunity Card": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Others": "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const COMPLETED_STATUSES = ["COMPLETED", "TRAINING_FINISHED"];

export default function AdminCandidatesClient({ candidates, partners, allStatuses }: Props) {
  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [processFilter, setProcessFilter] = useState<string>("all"); // all | ongoing | completed | on-hold
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(true);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          c.fullName.toLowerCase().includes(q) ||
          c.sccgId?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          (c.partnerName || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      // Partner
      if (partnerFilter === "direct") {
        if (c.partnerId !== "SCCG-DIRECT") return false;
      } else if (partnerFilter !== "all") {
        if (c.partnerId !== partnerFilter) return false;
      }

      // Category
      if (categoryFilter !== "all" && c.workflowCategory !== categoryFilter) return false;

      // Process
      if (processFilter === "ongoing") {
        if (COMPLETED_STATUSES.includes(c.currentStatus) || c.isOnHold) return false;
      } else if (processFilter === "completed") {
        if (!COMPLETED_STATUSES.includes(c.currentStatus)) return false;
      } else if (processFilter === "on-hold") {
        if (!c.isOnHold) return false;
      }

      // Status step
      if (statusFilter !== "all" && c.currentStatus !== statusFilter) return false;

      return true;
    });
  }, [candidates, search, partnerFilter, categoryFilter, processFilter, statusFilter]);

  const activeFilterCount = [
    partnerFilter !== "all",
    categoryFilter !== "all",
    processFilter !== "all",
    statusFilter !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setPartnerFilter("all");
    setCategoryFilter("all");
    setProcessFilter("all");
    setStatusFilter("all");
    setSearch("");
  };

  // Compute stats
  const directCount = candidates.filter((c) => c.partnerId === "SCCG-DIRECT").length;
  const ongoingCount = candidates.filter(
    (c) => !COMPLETED_STATUSES.includes(c.currentStatus) && !c.isOnHold
  ).length;
  const completedCount = candidates.filter((c) => COMPLETED_STATUSES.includes(c.currentStatus)).length;
  const onHoldCount = candidates.filter((c) => c.isOnHold).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">All Candidates</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/candidates/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Register Candidate
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => { setProcessFilter("all"); setPartnerFilter("all"); }}
          className={`rounded-xl border p-3 text-left transition-colors ${processFilter === "all" && partnerFilter === "all" ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
        >
          <p className="text-2xl font-bold">{candidates.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </button>
        <button
          onClick={() => { setProcessFilter("ongoing"); setPartnerFilter("all"); }}
          className={`rounded-xl border p-3 text-left transition-colors ${processFilter === "ongoing" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "hover:bg-muted"}`}
        >
          <p className="text-2xl font-bold text-blue-600">{ongoingCount}</p>
          <p className="text-xs text-muted-foreground">Ongoing</p>
        </button>
        <button
          onClick={() => { setProcessFilter("completed"); setPartnerFilter("all"); }}
          className={`rounded-xl border p-3 text-left transition-colors ${processFilter === "completed" ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "hover:bg-muted"}`}
        >
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </button>
        <button
          onClick={() => { setPartnerFilter("direct"); setProcessFilter("all"); }}
          className={`rounded-xl border p-3 text-left transition-colors ${partnerFilter === "direct" ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "hover:bg-muted"}`}
        >
          <p className="text-2xl font-bold text-amber-600">{directCount}</p>
          <p className="text-xs text-muted-foreground">Direct Sale</p>
        </button>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, email, or partner..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters ? "bg-primary/10 border-primary/30 text-primary" : "hover:bg-muted"}`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline">
            Clear all
          </button>
        )}
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-2xl border">
          {/* Partner */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Partner</label>
            <div className="relative">
              <select
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Partners</option>
                <option value="direct">SCCG Direct Sale</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Categories</option>
                <option value="Training & Language">Training & Language</option>
                <option value="Ausbildung">Ausbildung</option>
                <option value="Student">Student</option>
                <option value="Opportunity Card">Opportunity Card</option>
                <option value="Others">Others</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Process */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Process</label>
            <div className="relative">
              <select
                value={processFilter}
                onChange={(e) => setProcessFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All</option>
                <option value="ongoing">Ongoing ({ongoingCount})</option>
                <option value="completed">Completed ({completedCount})</option>
                {onHoldCount > 0 && <option value="on-hold">On Hold ({onHoldCount})</option>}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Status step */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status Step</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Steps</option>
                {allStatuses.map((s) => (
                  <option key={s} value={s}>{formatStatusLabel(s)}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
        {partnerFilter === "direct" && " · SCCG Direct Sales"}
        {partnerFilter !== "all" && partnerFilter !== "direct" && ` · ${partners.find(p => p.id === partnerFilter)?.name || "Partner"}`}
      </p>

      {/* Table */}
      <div className="bg-card rounded-2xl border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No candidates match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Partner</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fee</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.fullName}</p>
                      <p className="text-xs text-muted-foreground">{c.sccgId}</p>
                    </td>
                    <td className="px-4 py-3">
                      {c.partnerId === "SCCG-DIRECT" ? (
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Direct Sale
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {c.partnerName ?? c.partnerId.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          CATEGORY_COLORS[c.workflowCategory] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.workflowCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {formatStatusLabel(c.currentStatus)}
                      </span>
                      {c.isOnHold && (
                        <span className="ml-1 text-xs text-red-500 font-medium">(On Hold)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      €{c.totalServiceFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {c.createdAt ? format(parseISO(c.createdAt), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/candidates/${c.id}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
