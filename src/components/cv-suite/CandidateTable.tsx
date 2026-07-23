"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Check,
  X,
  Download,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatStatusLabel } from "@/lib/engine/candidate-workflow";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/types";

// ── Types ─────────────────────────────────────────────────────
type SortField = "fullName" | "createdAt" | "totalServiceFee" | "currentStatus" | "workflowCategory";
type SortDir = "asc" | "desc";

interface CandidateTableProps {
  candidates: Candidate[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  linkPrefix?: string;
  pageSize?: number;
  showBulkActions?: boolean;
  onBulkExport?: (ids: string[], format: "pdf" | "csv") => void;
  onBulkHold?: (ids: string[], hold: boolean) => void;
}

const CATEGORY_BADGES: Record<string, string> = {
  Training: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Ausbildung: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "Student Visa": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Opportunity Card": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const PAYMENT_BADGES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "deposit-paid": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "fully-paid": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const CATEGORIES = ["Training", "Ausbildung", "Student Visa", "Opportunity Card"];
const PAYMENT_STATUSES = ["pending", "deposit-paid", "fully-paid"];

export function CandidateTable({
  candidates,
  selectable = false,
  selectedIds: externalSelectedIds,
  onSelectionChange,
  linkPrefix = "/admin/cv-suite/candidates",
  pageSize: defaultPageSize = 20,
  showBulkActions = false,
  onBulkExport,
  onBulkHold,
}: CandidateTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());

  const selected = externalSelectedIds ?? internalSelected;
  const setSelected = onSelectionChange ?? setInternalSelected;

  // ── Filtering ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = candidates;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.sccgId.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.partnerName ?? "").toLowerCase().includes(q)
      );
    }
    if (categoryFilter) result = result.filter((c) => c.workflowCategory === categoryFilter);
    if (paymentFilter) result = result.filter((c) => c.paymentStatus === paymentFilter);
    if (statusFilter) result = result.filter((c) => c.currentStatus === statusFilter);

    return result;
  }, [candidates, search, categoryFilter, paymentFilter, statusFilter]);

  // ── Sorting ─────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      const fa = a[sortField];
      const fb = b[sortField];
      if (typeof fa === "number" && typeof fb === "number") cmp = fa - fb;
      else cmp = String(fa ?? "").localeCompare(String(fb ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  // ── Pagination ──────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ── Unique statuses for filter ──────────────────────────────
  const uniqueStatuses = useMemo(
    () => [...new Set(candidates.map((c) => c.currentStatus as string))].sort(),
    [candidates]
  );

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function toggleSelectAll() {
    if (paged.every((c) => selected.has(c.id))) {
      const next = new Set(selected);
      paged.forEach((c) => next.delete(c.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      paged.forEach((c) => next.add(c.id));
      setSelected(next);
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-primary" />
    ) : (
      <ChevronDown className="w-3 h-3 text-primary" />
    );
  }

  const activeFilterCount = [categoryFilter, paymentFilter, statusFilter].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, email, SCCG ID, partner…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category pills */}
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter((f) => (f === cat ? null : cat));
                setPage(1);
              }}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-200",
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "hover:bg-muted border-border"
              )}
            >
              {cat}
            </button>
          ))}

          {/* Payment filter */}
          <select
            value={paymentFilter ?? ""}
            onChange={(e) => {
              setPaymentFilter(e.target.value || null);
              setPage(1);
            }}
            className="text-xs px-3 py-1.5 rounded-full border bg-card font-medium outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Payments</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter ?? ""}
            onChange={(e) => {
              setStatusFilter(e.target.value || null);
              setPage(1);
            }}
            className="text-xs px-3 py-1.5 rounded-full border bg-card font-medium outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {formatStatusLabel(s)}
              </option>
            ))}
          </select>

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setCategoryFilter(null);
                setPaymentFilter(null);
                setStatusFilter(null);
                setPage(1);
              }}
              className="text-xs text-destructive hover:text-destructive/80 font-medium flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Bulk Actions Bar ─────────────────────────────────── */}
      {showBulkActions && selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="text-sm font-medium text-primary">
            {selected.size} selected
          </span>
          <div className="flex-1" />
          {onBulkExport && (
            <>
              <button
                onClick={() => onBulkExport([...selected], "pdf")}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>
              <button
                onClick={() => onBulkExport([...selected], "csv")}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </>
          )}
          {onBulkHold && (
            <>
              <button
                onClick={() => onBulkHold([...selected], true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30 transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
                Hold
              </button>
              <button
                onClick={() => onBulkHold([...selected], false)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Resume
              </button>
            </>
          )}
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No candidates match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  {selectable && (
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={paged.length > 0 && paged.every((c) => selected.has(c.id))}
                        onChange={toggleSelectAll}
                        className="rounded border-muted-foreground/30 accent-primary"
                      />
                    </th>
                  )}
                  <th className="text-left px-4 py-3">
                    <button onClick={() => toggleSort("fullName")} className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Candidate <SortIcon field="fullName" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Partner</th>
                  <th className="text-left px-4 py-3">
                    <button onClick={() => toggleSort("workflowCategory")} className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Category <SortIcon field="workflowCategory" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">
                    <button onClick={() => toggleSort("currentStatus")} className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Status <SortIcon field="currentStatus" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
                  <th className="text-right px-4 py-3">
                    <button onClick={() => toggleSort("totalServiceFee")} className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto">
                      Fee <SortIcon field="totalServiceFee" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">
                    <button onClick={() => toggleSort("createdAt")} className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Date <SortIcon field="createdAt" />
                    </button>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {paged.map((c) => (
                  <tr
                    key={c.id}
                    className={cn(
                      "transition-colors",
                      selected.has(c.id)
                        ? "bg-primary/5"
                        : "hover:bg-muted/20"
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded border-muted-foreground/30 accent-primary"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.fullName}</p>
                      <p className="text-xs text-muted-foreground">{c.sccgId}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {c.partnerName ?? c.partnerId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", CATEGORY_BADGES[c.workflowCategory] ?? "bg-muted text-muted-foreground")}>
                        {c.workflowCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {formatStatusLabel(c.currentStatus as string)}
                      </span>
                      {c.isOnHold && (
                        <span className="ml-1 text-xs text-rose-500 font-medium">(Hold)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", PAYMENT_BADGES[c.paymentStatus] ?? "bg-muted text-muted-foreground")}>
                        {c.paymentStatus.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      €{c.totalServiceFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {c.createdAt ? format(parseISO(c.createdAt), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`${linkPrefix}/${c.id}`}
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

      {/* ── Pagination ───────────────────────────────────────── */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of{" "}
              {sorted.length}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs border rounded-lg px-2 py-1 bg-card outline-none focus:ring-2 focus:ring-primary/20"
            >
              {[20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (safePage <= 3) pageNum = i + 1;
              else if (safePage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = safePage - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-medium transition-colors",
                    pageNum === safePage
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
