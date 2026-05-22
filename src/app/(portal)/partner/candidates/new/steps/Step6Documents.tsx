"use client";

import { useState } from "react";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import type { WorkflowCategory } from "@/types";

const REQUIRED_DOCS: Record<WorkflowCategory, string[]> = {
  Training: ["Passport Copy", "CV/Resume", "Educational Certificates"],
  Ausbildung: [
    "Passport Copy",
    "CV/Resume",
    "Educational Certificates",
    "Language Certificate (B1+)",
    "Motivation Letter",
  ],
  "Student Visa": [
    "Passport Copy",
    "Educational Certificates",
    "Admission Letter",
    "Bank Statement",
  ],
  "Opportunity Card": [
    "Passport Copy",
    "CV/Resume",
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
  onNext: (docs: UploadedDoc[]) => void;
  onBack: () => void;
}

export function Step6Documents({
  workflowCategory,
  candidateId,
  candidateName,
  onNext,
  onBack,
}: Step6DocumentsProps) {
  const requiredDocs = REQUIRED_DOCS[workflowCategory];
  const [uploaded, setUploaded] = useState<Map<string, UploadedDoc>>(new Map());
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

  const allUploaded = requiredDocs.every((d) => uploaded.has(d));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Document Upload</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload required documents for {workflowCategory}. PDF, JPG, PNG — max 5MB each.
        </p>
      </div>

      <div className="space-y-3">
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
                <p className="text-sm font-medium">{docType}</p>
                {doc && (
                  <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                )}
                {errors[docType] && (
                  <p className="text-xs text-red-500">{errors[docType]}</p>
                )}
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(docType, file);
                  }}
                />
                <span className="text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors flex items-center gap-1.5">
                  {isUploading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  {doc ? "Replace" : "Upload"}
                </span>
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => onNext(Array.from(uploaded.values()))}
          disabled={!allUploaded}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
