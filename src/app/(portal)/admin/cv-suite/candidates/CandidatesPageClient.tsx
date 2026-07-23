"use client";

import { useState } from "react";
import { CandidateTable } from "@/components/cv-suite/CandidateTable";
import { ExportDialog, type ExportOptions } from "@/components/cv-suite/ExportDialog";
import { exportCandidatesCsvAction, bulkToggleOnHoldAction } from "../actions";
import type { Candidate } from "@/types";

export function CandidatesPageClient({
  candidates,
}: {
  candidates: Candidate[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv" | null>(null);

  async function handleBulkExport(ids: string[], format: "pdf" | "csv") {
    if (format === "csv") {
      // Direct CSV download
      const csv = await exportCandidatesCsvAction(ids);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `candidates-export-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      setExportFormat(format);
      setExportOpen(true);
    }
  }

  async function handleBulkHold(ids: string[], hold: boolean) {
    const result = await bulkToggleOnHoldAction(ids, hold);
    // Simple feedback — in production you'd use a toast
    if (result.failed > 0) {
      alert(`${result.success} updated, ${result.failed} failed.`);
    }
    // Force page reload to show updated data
    window.location.reload();
  }

  async function handleExport(options: ExportOptions) {
    const ids = [...selected];
    if (options.format === "csv" || options.format === "json") {
      const csv = await exportCandidatesCsvAction(ids.length > 0 ? ids : undefined);
      const isJson = options.format === "json";
      let content = csv;

      if (isJson) {
        // Convert CSV to JSON
        const lines = csv.split("\n");
        const headers = lines[0].split(",").map((h) => h.trim());
        const jsonRows = lines.slice(1).map((line) => {
          const values = line.split(",");
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => {
            obj[h] = (values[i] ?? "").replace(/^"|"$/g, "");
          });
          return obj;
        });
        content = JSON.stringify(jsonRows, null, 2);
      }

      const blob = new Blob([content], {
        type: isJson ? "application/json" : "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `candidates-export-${Date.now()}.${isJson ? "json" : "csv"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // PDF export — generate via API
      const idParams = ids.length > 0 ? ids.map((id) => `id=${id}`).join("&") : "";
      const url = `/api/cv-suite/export?${idParams}&content=${options.content}&format=${options.format}`;
      window.open(url, "_blank");
    }
  }

  return (
    <>
      <CandidateTable
        candidates={candidates}
        selectable={true}
        selectedIds={selected}
        onSelectionChange={setSelected}
        showBulkActions={true}
        onBulkExport={handleBulkExport}
        onBulkHold={handleBulkHold}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        selectedCount={selected.size || candidates.length}
        onExport={handleExport}
      />
    </>
  );
}
