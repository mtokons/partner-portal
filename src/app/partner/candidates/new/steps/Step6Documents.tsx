"use client";

import { useState } from "react";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import type { WorkflowCategory } from "@/types";

const REQUIRED_DOCS: Record<WorkflowCategory, string[]> = {
  Training: ["Passport Copy", "CV/Resume"],
  Ausbildung: ["Passport Copy", "CV/Resume"],
  "Student Visa": ["Passport Copy", "CV/Resume"],
  "Opportunity Card": ["Passport Copy", "CV/Resume"],
};

const OPTIONAL_DOCS: Record<WorkflowCategory, string[]> = {
  Training: ["Educational Certificates"],
  Ausbildung: [
    "Educational Certificates",
    "Language Certificate (B1+)",
    "Motivation Letter",
  ],
  "Student Visa": [
    "Educational Certificates",
    "Admission Letter",
    "Bank Statement",
  ],
  "Opportunity Card": [
    "Educational Certificates",
    "ZAB Recognition Document",
    "Bank Statement",
  ],
};

interface UploadedDoc {
  documentType: string;
  fileUrl: string;
  fileName: string;
}

interface Step6DocumentsProps {
  workflowCategory: WorkflowCategory;
  candidateId?: string;
  candidateName?: string;
  existingDocuments?: UploadedDoc[];
  onNext: (docs: UploadedDoc[]) => void;
  onBack: () => void;
}

export function Step6Documents({
  workflowCategory,
  candidateId,
  candidateName,
  existingDocuments,
  onNext,
  onBack,
}: Step6DocumentsProps) {
  const requiredDocs = REQUIRED_DOCS[workflowCategory];
  const optionalDocs = OPTIONAL_DOCS[workflowCategory] || [];
  const allDocs = [...requiredDocs, ...optionalDocs];
  const [uploaded, setUploaded] = useState<Map<string, UploadedDoc>>(() => {
    // Pre-populate with existing documents from a returning candidate
    const initial = new Map<string, UploadedDoc>();
    if (existingDocuments) {
      for (const doc of existingDocuments) {
        initial.set(doc.documentType, doc);
      }
    }
    return initial;
  });
  const [uploading, setUploading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleFile(docType: string, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [docType]: "File must be under 5MB" }));
      return;
    }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setErrors((prev) => ({ ...prev, [docType]: "Only PDF, JPG, PNG allowed" }));
      return;
    }
    setErrors((prev) => ({ ...prev, [docType]: "" }));
    setUploading(docType);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", docType);
      if (candidateId) formData.append("candidateId", candidateId);
      if (candidateName) formData.append("candidateName", candidateName);

      const res = await fetch("/api/upload-candidate-doc", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      setUploaded((prev) => {
        const next = new Map(prev);
        next.set(docType, { documentType: docType, fileUrl: json.fileUrl, fileName: file.name });
        return next;
      });
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [docType]: err instanceof Error ? err.message : "Upload failed",
      }));
    } finally {
      setUploading(null);
    }
  }

  const mandatoryUploaded = requiredDocs.every((d) => uploaded.has(d));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Document Upload</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload documents for {workflowCategory}. PDF, JPG, PNG — max 5MB each.
        </p>
      </div>

      {/* Mandatory Documents */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Required Documents <span className="text-red-500">*</span>
        </p>
        {requiredDocs.map((docType) => {
          const doc = uploaded.get(docType);
          const isUploading = uploading === docType;
          return (
            <div key={docType} className="border rounded-xl p-3 flex items-center gap-3">
              {doc ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{docType} <span className="text-red-500">*</span></p>
                {doc && (
                  <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                )}
                {errors[docType] && (
                  <p className="text-xs text-red-500">{errors[docType]}</p>
                )}
              </div>
              <label className="cursor-pointer">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" disabled={isUploading}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(docType, file); }} />
                <span className="text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors flex items-center gap-1.5">
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {doc ? "Replace" : "Upload"}
                </span>
              </label>
            </div>
          );
        })}
      </div>

      {/* Optional Documents */}
      {optionalDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Optional Documents <span className="text-muted-foreground/60">(can upload later)</span>
          </p>
          {optionalDocs.map((docType) => {
            const doc = uploaded.get(docType);
            const isUploading = uploading === docType;
            return (
              <div key={docType} className="border border-dashed rounded-xl p-3 flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                {doc ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{docType}</p>
                  {doc && <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>}
                  {errors[docType] && <p className="text-xs text-red-500">{errors[docType]}</p>}
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" disabled={isUploading}
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(docType, file); }} />
                  <span className="text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors flex items-center gap-1.5">
                    {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {doc ? "Replace" : "Upload"}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => onNext(Array.from(uploaded.values()))}
          disabled={!mandatoryUploaded}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
