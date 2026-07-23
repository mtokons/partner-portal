"use client";

import { useState } from "react";
import { Download, FileText, Table, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  onExport: (options: ExportOptions) => Promise<void>;
}

export interface ExportOptions {
  format: "pdf-individual" | "pdf-merged" | "csv" | "json";
  content: "profile" | "offer" | "invoice" | "cv" | "dossier";
}

const FORMAT_OPTIONS = [
  {
    value: "csv" as const,
    label: "CSV Spreadsheet",
    desc: "Excel-compatible data export",
    icon: Table,
  },
  {
    value: "pdf-individual" as const,
    label: "PDF (Individual)",
    desc: "Separate PDF per candidate",
    icon: FileText,
  },
  {
    value: "pdf-merged" as const,
    label: "PDF (Merged)",
    desc: "All candidates in one PDF",
    icon: FileText,
  },
  {
    value: "json" as const,
    label: "JSON Data",
    desc: "Raw structured data",
    icon: Download,
  },
];

const CONTENT_OPTIONS = [
  { value: "profile" as const, label: "Candidate Profile", desc: "Personal info, status, partner" },
  { value: "offer" as const, label: "Service Offer", desc: "Services, pricing, financial split" },
  { value: "invoice" as const, label: "Invoice", desc: "Billing details and payment status" },
  { value: "cv" as const, label: "CV / Resume", desc: "Professional profile summary" },
  { value: "dossier" as const, label: "Full Dossier", desc: "Complete candidate file" },
];

export function ExportDialog({ open, onClose, selectedCount, onExport }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportOptions["format"]>("csv");
  const [content, setContent] = useState<ExportOptions["content"]>("profile");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const isPdf = format === "pdf-individual" || format === "pdf-merged";

  async function handleExport() {
    setLoading(true);
    try {
      await onExport({ format, content });
      onClose();
    } catch {
      // error handling done in parent
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-card border rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-foreground">Export Candidates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedCount} candidate{selectedCount !== 1 ? "s" : ""} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Format Selection */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200",
                    format === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "hover:bg-muted/50"
                  )}
                >
                  <opt.icon
                    className={cn(
                      "w-4 h-4 mt-0.5 shrink-0",
                      format === opt.value ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Selection — only for PDF */}
          {isPdf && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Content Type
              </label>
              <div className="space-y-1.5">
                {CONTENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setContent(opt.value)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200",
                      content === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        content === opt.value
                          ? "border-primary"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {content === opt.value && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/20 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {loading ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
