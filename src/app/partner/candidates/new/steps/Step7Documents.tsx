"use client";

import { useState, useEffect } from "react";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import type { WorkflowCategory } from "@/types";

const REQUIRED_DOCS: Record<WorkflowCategory, string[]> = {
  "Training & Language": ["Passport Copy", "CV/Resume"],
  Ausbildung: ["Passport Copy", "CV/Resume"],
  "Student": ["Passport Copy", "CV/Resume"],
  "Opportunity Card": ["Passport Copy", "CV/Resume"],
  "Others": ["Passport Copy"],
};

const OPTIONAL_DOCS: Record<WorkflowCategory, string[]> = {
  "Training & Language": ["Educational Certificates"],
  Ausbildung: [
    "Educational Certificates",
    "Language Certificate (B1+)",
    "Motivation Letter",
  ],
  "Student": [
    "Educational Certificates",
    "Admission Letter",
    "Bank Statement",
  ],
  "Opportunity Card": [
    "Educational Certificates",
    "ZAB Recognition Document",
    "Bank Statement",
  ],
  "Others": ["Supporting Documents"],
};

interface UploadedDoc {
  documentType: string;
  fileUrl: string;
  fileName: string;
}

interface Step7DocumentsProps {
  workflowCategory: WorkflowCategory;
  candidateId?: string;
  candidateName?: string;
  existingDocuments?: UploadedDoc[];
  onNext: (docs: UploadedDoc[]) => void;
}

export function Step7Documents({
  workflowCategory,
  candidateId,
  candidateName,
  existingDocuments,
  onNext,
}: Step7DocumentsProps) {
  const requiredDocs = REQUIRED_DOCS[workflowCategory] || ["Passport Copy"];
  const optionalDocs = OPTIONAL_DOCS[workflowCategory] || [];
  const allDocs = [...requiredDocs, ...optionalDocs];
  const [uploaded, setUploaded] = useState<Map<string, UploadedDoc>>(() => {
    // Pre-populate with existing documents from props
    const initial = new Map<string, UploadedDoc>();
    if (existingDocuments) {
      for (const doc of existingDocuments) {
        initial.set(doc.documentType, doc);
      }
    }
    return initial;
  });
  const [uploading, setUploading] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fetch existing documents from drive if candidateId is present
  useEffect(() => {
    if (!candidateId) return;
    let isCancelled = false;
    async function loadDocs() {
      try {
        setLoadingExisting(true);
        const res = await fetch(`/api/partner/candidates/${candidateId}/documents`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.documents) && !isCancelled) {
          setUploaded((prev) => {
            const next = new Map(prev);
            for (const doc of data.documents) {
              const docName = doc.name || "";
              // Match document type by prefix or name
              for (const targetDoc of allDocs) {
                const cleanTarget = targetDoc.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
                if (docName.toLowerCase().includes(cleanTarget) || docName.toLowerCase().includes(targetDoc.toLowerCase())) {
                  next.set(targetDoc, {
                    documentType: targetDoc,
                    fileUrl: doc.webUrl || doc.downloadUrl,
                    fileName: doc.name,
                  });
                }
              }
            }
            return next;
          });
        }
      } catch (err) {
        console.warn("Failed to load existing candidate documents:", err);
      } finally {
        if (!isCancelled) setLoadingExisting(false);
      }
    }
    loadDocs();
    return () => { isCancelled = true; };
  }, [candidateId]);

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
          Upload documents for {workflowCategory}. PDF, JPG, PNG — max 5MB each. You can also skip and upload later.
        </p>
      </div>

      {/* Recommended Documents */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Recommended Documents <span className="text-muted-foreground/60">(can upload later)</span>
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
                <p className="text-sm font-medium">{docType}</p>
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

      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => onNext([])}
          className="px-4 py-2 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Skip for now
        </button>
        <button
          onClick={() => onNext(Array.from(uploaded.values()))}
          disabled={uploaded.size === 0}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          {allUploaded ? "Finish Registration" : `Finish with ${uploaded.size} doc${uploaded.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
