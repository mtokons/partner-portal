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
  Table,
  Check,
} from "lucide-react";
import { importCustomersCsvAction, type CsvImportRow } from "./actions";

interface CustomerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function CustomerImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: CustomerImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, startImporting] = useTransition();
  const [importResult, setImportResult] = useState<{ count?: number; errors?: string[] } | null>(null);

  if (!isOpen) return null;

  const downloadSampleCsv = () => {
    const csvContent =
      "FullName,Email,Phone,Nationality,Country,PassportNumber,PartnerName,WorkflowCategory,PaymentStatus,TotalServiceFee,DepositAmount,ServiceName,ServiceStatus,Notes\n" +
      "John Doe,john.doe@example.com,+49 151 1234567,German,Germany,C01X23456,,Training & Language,deposit-paid,2500,1000,German B2 Intensive Course,RUNNING,Enrolled in Sept batch\n" +
      "Jane Smith,jane.smith@partner.com,+880 1711 000000,Bangladeshi,Bangladesh,A98765432,EduAbroad Global,Ausbildung,fully-paid,3200,3200,Nursing Ausbildung Placement,COMPLETED,Visa issued successfully\n" +
      "Ahmed Khan,ahmed.khan@gmail.com,+91 98765 43210,Indian,India,Z55443322,,Opportunity Card,pending,1800,0,Opportunity Card Evaluation,REGISTERED,Waiting for document check";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sccg_customers_sample_template.csv");
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

        // Parse Header
        const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());

        const getIndex = (aliases: string[]) => {
          return headers.findIndex((h) => aliases.some((a) => h.includes(a)));
        };

        const idxName = getIndex(["fullname", "full name", "name", "clientname", "customer"]);
        const idxEmail = getIndex(["email", "mail"]);
        const idxPhone = getIndex(["phone", "mobile", "contact"]);
        const idxNat = getIndex(["nationality", "citizen"]);
        const idxCountry = getIndex(["country", "residence"]);
        const idxPass = getIndex(["passport", "pass", "nid", "nationalid"]);
        const idxPartner = getIndex(["partner", "source", "agency"]);
        const idxCategory = getIndex(["category", "workflow", "track"]);
        const idxPayment = getIndex(["payment", "paystatus"]);
        const idxFee = getIndex(["totalfee", "fee", "price", "amount"]);
        const idxDeposit = getIndex(["deposit", "paid", "advance"]);
        const idxService = getIndex(["service", "course", "package"]);
        const idxServiceStatus = getIndex(["servicestatus", "progress", "state"]);
        const idxNotes = getIndex(["notes", "comment", "remark"]);

        if (idxName === -1 || idxEmail === -1) {
          setParseError("Could not detect required 'FullName' and 'Email' columns in CSV header.");
          return;
        }

        const rows: CsvImportRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          // simple CSV splitter handling quoted values
          const line = lines[i];
          const cols: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let char of line) {
            if (char === '"' || char === "'") {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
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
            fullName: name,
            email,
            phone: idxPhone !== -1 ? cols[idxPhone]?.replace(/^["']|["']$/g, "").trim() : "",
            nationality: idxNat !== -1 ? cols[idxNat]?.replace(/^["']|["']$/g, "").trim() : "Unknown",
            country: idxCountry !== -1 ? cols[idxCountry]?.replace(/^["']|["']$/g, "").trim() : "Germany",
            passportNumber: idxPass !== -1 ? cols[idxPass]?.replace(/^["']|["']$/g, "").trim() : "",
            partnerName: idxPartner !== -1 ? cols[idxPartner]?.replace(/^["']|["']$/g, "").trim() : "",
            workflowCategory: idxCategory !== -1 ? cols[idxCategory]?.replace(/^["']|["']$/g, "").trim() : "Training & Language",
            paymentStatus: idxPayment !== -1 ? cols[idxPayment]?.replace(/^["']|["']$/g, "").trim() : "pending",
            totalServiceFee: idxFee !== -1 ? Number(cols[idxFee]?.replace(/[^0-9.]/g, "")) || 0 : 0,
            depositAmount: idxDeposit !== -1 ? Number(cols[idxDeposit]?.replace(/[^0-9.]/g, "")) || 0 : 0,
            serviceName: idxService !== -1 ? cols[idxService]?.replace(/^["']|["']$/g, "").trim() : "",
            serviceStatus: idxServiceStatus !== -1 ? cols[idxServiceStatus]?.replace(/^["']|["']$/g, "").trim() : "RUNNING",
            notes: idxNotes !== -1 ? cols[idxNotes]?.replace(/^["']|["']$/g, "").trim() : "",
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
      const res = await importCustomersCsvAction(parsedRows);
      if (res.success) {
        setImportResult({ count: res.importedCount, errors: res.errors });
        setTimeout(() => {
          onImportSuccess();
        }, 1200);
      } else {
        setParseError(res.errors?.join(", ") || "Failed to import rows.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
      <div className="flex h-full max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Import Existing Customers / List</h2>
              <p className="text-xs text-muted-foreground">
                Upload CSV from SharePoint, CRM, or spreadsheets to bulk create customer profiles.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action Bar / Template Download */}
          <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/10 p-4">
            <div>
              <h3 className="text-xs font-bold text-foreground">Need the standard column format?</h3>
              <p className="text-[11px] text-muted-foreground">
                Download sample CSV template with columns for personal info, partners, services, and fees.
              </p>
            </div>
            <button
              onClick={downloadSampleCsv}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              Download Template
            </button>
          </div>

          {/* Upload Dropzone */}
          <div>
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 hover:border-primary/50 transition-colors cursor-pointer bg-card hover:bg-muted/10">
              <Upload className="h-8 w-8 text-primary mb-2" />
              <span className="text-xs font-bold text-foreground">
                {file ? file.name : "Click or drag CSV file here"}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">Supports standard UTF-8 .csv files</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Error Message */}
          {parseError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Success Message */}
          {importResult && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Successfully imported {importResult.count} customer records! Refreshing...</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Previewing {parsedRows.length} Detected Customers
                </span>
                <span className="text-[11px] text-muted-foreground">Ready for database import</span>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted border-b border-border text-muted-foreground">
                    <tr>
                      <th className="p-2.5 font-bold">#</th>
                      <th className="p-2.5 font-bold">Full Name</th>
                      <th className="p-2.5 font-bold">Email</th>
                      <th className="p-2.5 font-bold">Phone</th>
                      <th className="p-2.5 font-bold">Partner / Source</th>
                      <th className="p-2.5 font-bold">Service</th>
                      <th className="p-2.5 font-bold">Fee (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="p-2.5 font-semibold text-foreground">{r.fullName}</td>
                        <td className="p-2.5 text-muted-foreground">{r.email}</td>
                        <td className="p-2.5 text-muted-foreground">{r.phone || "—"}</td>
                        <td className="p-2.5">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold">
                            {r.partnerName || "Direct SCCG"}
                          </span>
                        </td>
                        <td className="p-2.5 text-muted-foreground">{r.serviceName || "—"}</td>
                        <td className="p-2.5 font-mono font-bold text-foreground">
                          €{r.totalServiceFee?.toLocaleString() || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4 bg-muted/20">
          <button
            onClick={onClose}
            className="rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleCommitImport}
            disabled={isImporting || parsedRows.length === 0}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirm & Import {parsedRows.length} Customers
          </button>
        </div>
      </div>
    </div>
  );
}
