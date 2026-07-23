"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentCompletenessRow } from "../actions";

const CATEGORY_BADGES: Record<string, string> = {
  Training: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Ausbildung: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "Student Visa": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Opportunity Card": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export function DocumentsClient({ data }: { data: DocumentCompletenessRow[] }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filtered = useMemo(() => {
    let result = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.candidateName.toLowerCase().includes(q) ||
          r.sccgId.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      result = result.filter((r) => r.workflowCategory === categoryFilter);
    }
    return result;
  }, [data, search, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Summary stats
  const totalDocs = data.reduce((sum, r) => sum + r.requiredDocs.length, 0);
  const uploaded = data.reduce((sum, r) => sum + r.uploadedCount, 0);
  const missing = totalDocs - uploaded;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FolderOpen className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Required</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalDocs}</p>
        </div>
        <div className="bg-card rounded-2xl border p-5 space-y-1">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Uploaded</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{uploaded}</p>
        </div>
        <div className="bg-card rounded-2xl border p-5 space-y-1">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Missing</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{missing}</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 rounded-xl">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          <strong>Note:</strong> Document tracking is currently showing required documents per candidate.
          Real-time upload status from SharePoint will be integrated in the next phase. Currently all documents show as &quot;Pending&quot;.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search candidate…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {["Training", "Ausbildung", "Student Visa", "Opportunity Card"].map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategoryFilter((f) => f === cat ? null : cat); setPage(1); }}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-200",
              categoryFilter === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Document Matrix */}
      <div className="bg-card rounded-2xl border overflow-hidden">
        {paged.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No candidates found.</div>
        ) : (
          <div className="divide-y">
            {paged.map((row) => (
              <div key={row.candidateId} className="p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <Link
                    href={`/admin/cv-suite/candidates/${row.candidateId}`}
                    className="font-medium text-foreground text-sm hover:text-primary transition-colors"
                  >
                    {row.candidateName}
                  </Link>
                  <span className="text-xs text-muted-foreground">{row.sccgId}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", CATEGORY_BADGES[row.workflowCategory] ?? "bg-muted text-muted-foreground")}>
                    {row.workflowCategory}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {row.uploadedCount}/{row.requiredDocs.length}
                    </span>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${row.completionPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.requiredDocs.map((doc) => (
                    <span
                      key={doc}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border bg-muted/30"
                    >
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      {doc}
                      <span className="text-amber-500 text-[10px] font-medium">pending</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-medium">{safePage} / {totalPages}</span>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
