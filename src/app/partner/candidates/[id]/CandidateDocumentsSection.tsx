"use client";

import { useState, startTransition, useTransition } from "react";
import { 
  FileText, UploadCloud, Download, Trash2, 
  Loader2, CheckCircle, AlertCircle, File, Eye 
} from "lucide-react";
import { deleteCandidateDocumentAction } from "../actions";

interface DocumentItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  downloadUrl: string;
  createdAt: string;
}

interface CandidateDocumentsSectionProps {
  candidateId: string;
  candidateName: string;
  initialDocuments: DocumentItem[];
}

const DOCUMENT_TYPES = [
  "Passport Copy",
  "Academic Transcript",
  "Language Certificate",
  "CV / Resume",
  "Financial Document",
  "Other Support Doc"
];

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function CandidateDocumentsSection({
  candidateId,
  candidateName,
  initialDocuments
}: CandidateDocumentsSectionProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedDocType, setSelectedDocType] = useState(DOCUMENT_TYPES[0]);
  const [dragActive, setDragActive] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError("");

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit");
      setIsUploading(false);
      return;
    }

    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only PDF, JPG, and PNG are allowed");
      setIsUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("candidateId", candidateId);
      formData.append("candidateName", candidateName);
      formData.append("documentType", selectedDocType);
      formData.append("file", file);

      const res = await fetch("/api/upload-candidate-doc", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || "Upload failed");
      }

      // Add to list optimistically or rather fetch updated list
      // Since it saves it in graph, let's create a temporary document entry
      const newDoc: DocumentItem = {
        id: result.fileName || Math.random().toString(), // fallback
        name: result.fileName || file.name,
        size: file.size,
        webUrl: result.fileUrl,
        downloadUrl: result.fileUrl,
        createdAt: new Date().toISOString(),
      };

      setDocuments(prev => [newDoc, ...prev]);
      
      // Attempt to hot reload if possible
      const reloadRes = await fetch(`/api/partner/candidates/${candidateId}/documents`);
      if (reloadRes.ok) {
        const data = await reloadRes.json();
        if (data.success && data.documents) {
          setDocuments(data.documents);
        }
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to delete "${docName}"?`)) return;

    startTransition(async () => {
      const res = await deleteCandidateDocumentAction(candidateId, candidateName, docId);
      if (res.success) {
        setDocuments(prev => prev.filter(d => d.id !== docId));
      } else {
        alert(res.error || "Failed to delete document");
      }
    });
  };

  return (
    <div className="bg-card border border-white/10 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Candidate Document Center</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Store and retrieve candidate files securely in OneDrive / SharePoint.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary font-bold rounded-full">
          {documents.length} Files
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Panel */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Document Type</label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full bg-muted border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
            >
              {DOCUMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive 
                ? "border-primary bg-primary/5" 
                : "border-white/10 hover:border-white/20 bg-muted/40 hover:bg-muted/60"
            }`}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <label htmlFor="file-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center space-y-3">
              {isUploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <div className="text-sm font-semibold text-foreground">Uploading document...</div>
                  <div className="text-xs text-muted-foreground">Uploading directly to SharePoint folder</div>
                </>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-primary" />
                  <div>
                    <span className="text-sm font-bold text-primary hover:underline">Click to upload</span>
                    <span className="text-sm text-muted-foreground"> or drag and drop</span>
                  </div>
                  <div className="text-xs text-muted-foreground">PDF, JPG, PNG up to 5MB</div>
                </>
              )}
            </label>
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Document List */}
        <div className="lg:col-span-2 space-y-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Uploaded Documents</label>
          
          {documents.length === 0 ? (
            <div className="border border-white/5 bg-muted/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[200px]">
              <FileText className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-sm font-medium">No documents uploaded yet</p>
              <p className="text-xs opacity-60 mt-0.5">Use the upload box on the left to start saving candidate files.</p>
            </div>
          ) : (
            <div className="border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 bg-muted/10">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
                      <File className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate max-w-[280px]" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatBytes(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(doc.id, doc.name)}
                      disabled={isPending}
                      className="p-2 hover:bg-red-500/10 rounded-xl text-muted-foreground hover:text-red-500 transition-all cursor-pointer"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
