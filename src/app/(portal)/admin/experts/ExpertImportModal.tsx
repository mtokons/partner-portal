"use client";

import { useState, useTransition } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Check,
} from "lucide-react";
import { importExpertsCsvAction, type CsvExpertImportRow } from "./actions";

interface ExpertImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function ExpertImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: ExpertImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvExpertImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, startImporting] = useTransition();
  const [importResult, setImportResult] = useState<{ count?: number; errors?: string[] } | null>(null);

  if (!isOpen) return null;

  const downloadSampleCsv = () => {
    const csvContent =
      "Name,Email,Phone,Specialization,ExpertType,RatePerSession,Nationality,CurrentLocation,Status,Bio\n" +
      "Dr. Klaus Weber,klaus.weber@mysccg.de,+49 176 1234567,German B2/C1 Language Trainer,service,60,German,Munich,active,Senior language instructor with 10+ years experience\n" +
      "Sarah Jenkins,sarah.jenkins@expert.com,+44 20 7946 0991,International Healthcare Consultant,project,0,British,London,available,Specialist in European nursing credential evaluations\n" +
      "Dr. Florian Meyer,florian.meyer@sccg-lab.de,+49 151 9876543,Ausbildung Career Coach,service,50,German,Frankfurt,active,Guided 200+ apprentices into German placements";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sccg_experts_sample_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setParseError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text
          .split(/\r\n|\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          setParseError("CSV file must contain a header row and at least one data row.");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());

        const getIndex = (aliases: string[]) => {
          return headers.findIndex((h) => aliases.some((a) => h.includes(a)));
        };

        const idxName = getIndex(["name", "expertname", "fullname"]);
        const idxEmail = getIndex(["email", "mail"]);
        const idxPhone = getIndex(["phone", "mobile", "contact"]);
        const idxSpec = getIndex(["specialization", "position", "role", "field"]);
        const idxType = getIndex(["type", "experttype", "category"]);
        const idxRate = getIndex(["rate", "ratepersession", "fee", "sessionrate"]);
        const idxNat = getIndex(["nationality", "citizen"]);
        const idxLoc = getIndex(["location", "city", "currentlocation"]);
        const idxStatus = getIndex(["status", "state"]);
        const idxBio = getIndex(["bio", "notes", "description"]);

        if (idxName === -1 || idxEmail === -1) {
          setParseError("Could not detect required 'Name' and 'Email' columns in CSV header.");
          return;
        }

        const rows: CsvExpertImportRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const cols: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let char of line) {
            if (char === '"' || char === "'") inQuotes = !inQuotes;
            else if (char === "," && !inQuotes) {
              cols.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          cols.push(current.trim());

          const name = cols[idxName]?.replace(/^["']|["']$/g, "").trim();
          const email = cols[idxEmail]?.replace(/^["']|["']$/g, "").trim();

          if (!name || !email) continue;

          rows.push({
            name,
            email,
            phone: idxPhone !== -1 ? cols[idxPhone]?.replace(/^["']|["']$/g, "").trim() : "",
            specialization: idxSpec !== -1 ? cols[idxSpec]?.replace(/^["']|["']$/g, "").trim() : "Coach",
            expertType: idxType !== -1 ? cols[idxType]?.replace(/^["']|["']$/g, "").trim() : "service",
            ratePerSession: idxRate !== -1 ? Number(cols[idxRate]?.replace(/[^0-9.]/g, "")) || 50 : 50,
            nationality: idxNat !== -1 ? cols[idxNat]?.replace(/^["']|["']$/g, "").trim() : "German",
            currentLocation: idxLoc !== -1 ? cols[idxLoc]?.replace(/^["']|["']$/g, "").trim() : "Germany",
            status: idxStatus !== -1 ? cols[idxStatus]?.replace(/^["']|["']$/g, "").trim() : "active",
            bio: idxBio !== -1 ? cols[idxBio]?.replace(/^["']|["']$/g, "").trim() : "",
          });
        }

        setParsedRows(rows);
      } catch (err: any) {
        setParseError("Failed to parse CSV: " + err.message);
      }
    };
    reader.readAsText(uploadedFile);
  };

  const handleCommitImport = () => {
    if (!parsedRows.length) return;
    startImporting(async () => {
      const res = await importExpertsCsvAction(parsedRows);
      if (res.success) {
        setImportResult({ count: res.importedCount, errors: res.errors });
        setTimeout(() => {
          onImportSuccess();
        }, 1200);
      } else {
        setParseError(res.errors?.join(", ") || "Failed to import experts.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
      <div className="flex h-full max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between border-b border-border p-5 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Import Existing Experts / List</h2>
              <p className="text-xs text-muted-foreground">
                Upload CSV to bulk create Service Experts or Project Experts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/10 p-4">
            <div>
              <h3 className="text-xs font-bold text-foreground">Need standard CSV format?</h3>
              <p className="text-[11px] text-muted-foreground">
                Download sample template with columns for Service Experts & Project Consultants.
              </p>
            </div>
            <button
              onClick={downloadSampleCsv}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              Download Template
            </button>
          </div>

          <div>
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 hover:border-primary/50 cursor-pointer bg-card hover:bg-muted/10">
              <Upload className="h-8 w-8 text-primary mb-2" />
              <span className="text-xs font-bold text-foreground">
                {file ? file.name : "Click or drag CSV file here"}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">Supports UTF-8 CSV exports</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {parseError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {importResult && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Successfully imported {importResult.count} experts! Refreshing...</span>
            </div>
          )}

          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Previewing {parsedRows.length} Detected Experts
                </span>
                <span className="text-[11px] text-muted-foreground">Ready for database import</span>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted border-b border-border text-muted-foreground">
                    <tr>
                      <th className="p-2.5 font-bold">#</th>
                      <th className="p-2.5 font-bold">Expert Name</th>
                      <th className="p-2.5 font-bold">Email</th>
                      <th className="p-2.5 font-bold">Specialization</th>
                      <th className="p-2.5 font-bold">Type</th>
                      <th className="p-2.5 font-bold">Rate (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="p-2.5 font-semibold text-foreground">{r.name}</td>
                        <td className="p-2.5 text-muted-foreground">{r.email}</td>
                        <td className="p-2.5 text-muted-foreground">{r.specialization}</td>
                        <td className="p-2.5">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase">
                            {r.expertType}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-foreground">
                          {r.ratePerSession ? `€${r.ratePerSession}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border p-4 bg-muted/20">
          <button
            onClick={onClose}
            className="rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleCommitImport}
            disabled={isImporting || parsedRows.length === 0}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirm & Import {parsedRows.length} Experts
          </button>
        </div>
      </div>
    </div>
  );
}
