"use client";

import { useState } from "react";
import { Download, FileText, Table, FileJson, Users } from "lucide-react";
import { CandidateTable } from "@/components/cv-suite/CandidateTable";
import { ExportDialog, type ExportOptions } from "@/components/cv-suite/ExportDialog";
import { exportCandidatesCsvAction } from "../actions";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/types";

export function ExportCenterClient({
  candidates,
}: {
  candidates: Candidate[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);

  const selectedCount = selected.size || candidates.length;

  async function handleExport(options: ExportOptions) {
    const ids = selected.size > 0 ? [...selected] : undefined;

    if (options.format === "csv") {
      const csv = await exportCandidatesCsvAction(ids);
      downloadBlob(csv, "text/csv;charset=utf-8;", `candidates-${Date.now()}.csv`);
    } else if (options.format === "json") {
      const csv = await exportCandidatesCsvAction(ids);
      const lines = csv.split("\n");
      const headers = lines[0].split(",").map((h) => h.trim());
      const jsonRows = lines.slice(1).filter(Boolean).map((line) => {
        const values = line.split(",");
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = (values[i] ?? "").replace(/^"|"$/g, "");
        });
        return obj;
      });
      const content = JSON.stringify(jsonRows, null, 2);
      downloadBlob(content, "application/json", `candidates-${Date.now()}.json`);
    } else {
      // PDF — use API
      const idParams = ids ? ids.map((id) => `id=${id}`).join("&") : "";
      const url = `/api/cv-suite/export?${idParams}&content=${options.content}&format=${options.format}`;
      window.open(url, "_blank");
    }
  }

  function downloadBlob(content: string, type: string, filename: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Quick Export Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "CSV Export",
            desc: "All candidates as spreadsheet",
            icon: Table,
            color: "emerald",
            action: () => handleExport({ format: "csv", content: "profile" }),
          },
          {
            label: "JSON Export",
            desc: "Structured data export",
            icon: FileJson,
            color: "blue",
            action: () => handleExport({ format: "json", content: "profile" }),
          },
          {
            label: "Bulk PDF (CV)",
            desc: "All candidate profiles",
            icon: FileText,
            color: "violet",
            action: () => {
              const idParams = selected.size > 0 ? [...selected].map((id) => `id=${id}`).join("&") : "";
              window.open(`/api/cv-suite/export?${idParams}&content=cv&format=pdf-merged`, "_blank");
            },
          },
          {
            label: "Custom Export",
            desc: "Choose format & content",
            icon: Download,
            color: "amber",
            action: () => setExportOpen(true),
          },
        ].map((card) => {
          const colors: Record<string, string> = {
            emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700",
            blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700",
            violet: "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 hover:border-violet-300 dark:hover:border-violet-700",
            amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:border-amber-300 dark:hover:border-amber-700",
          };
          return (
            <button
              key={card.label}
              onClick={card.action}
              className={cn(
                "group flex flex-col items-center gap-3 p-6 rounded-2xl border text-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
                colors[card.color]
              )}
            >
              <div className="p-3 rounded-xl bg-current/10">
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{card.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection Info */}
      <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border">
        <Users className="w-5 h-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground flex-1">
          {selected.size > 0 ? (
            <>
              <span className="font-semibold text-foreground">{selected.size}</span> candidate{selected.size !== 1 ? "s" : ""} selected for export.
              Quick exports above will use your selection.
            </>
          ) : (
            <>
              No candidates selected — exports will include <span className="font-semibold text-foreground">all {candidates.length}</span> candidates.
              Select specific candidates below to narrow your export.
            </>
          )}
        </p>
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-primary hover:underline font-medium"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Candidate Selection Table */}
      <CandidateTable
        candidates={candidates}
        selectable={true}
        selectedIds={selected}
        onSelectionChange={setSelected}
        showBulkActions={false}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        selectedCount={selectedCount}
        onExport={handleExport}
      />
    </div>
  );
}
