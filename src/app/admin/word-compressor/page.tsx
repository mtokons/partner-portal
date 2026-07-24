"use client";

import { useState } from "react";
import { 
  FileArchive, Upload, CheckCircle2, ArrowRight, Loader2, 
  AlertCircle, Download, FileText, Sparkles, RefreshCw 
} from "lucide-react";

export default function WordCompressorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [result, setResult] = useState<{
    originalSize: number;
    compressedSize: number;
    ratio: number;
    downloadUrl: string;
    filename: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setResult(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".docx")) {
      setError("Only newer Word documents (.docx) are supported. If you have an older .doc file, please open it in Word and save it as .docx first.");
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleCompress = async () => {
    if (!file) return;
    setCompressing(true);
    setError("");
    setResult(null);
    setStatusText("Uploading and parsing document structure...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Call our FastAPI python proxy endpoint
      setStatusText("Extracting media files & compressing embedded images...");
      const res = await fetch("/api/cv-tailor/compress", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.detail || "Failed to compress document.");
      }

      setStatusText("Re-assembling Word archive with maximum compression...");
      const blob = await res.blob();
      
      // Parse content-disposition if possible
      let filename = file.name.substring(0, file.name.lastIndexOf(".")) || "compressed";
      filename = `${filename}_compressed.docx`;

      const downloadUrl = URL.createObjectURL(blob);
      const originalSize = file.size;
      const compressedSize = blob.size;
      const ratio = originalSize ? Math.max(0, Math.round((1 - compressedSize / originalSize) * 100)) : 0;

      setResult({
        originalSize,
        compressedSize,
        ratio,
        downloadUrl,
        filename,
      });
      
      // Auto download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during compression.");
    } finally {
      setCompressing(false);
      setStatusText("");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 p-6 md:p-10" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mx-auto max-w-2xl space-y-6">
        
        {/* Header card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-violet-500/10 text-violet-600">
              <FileArchive className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Word Document Compressor</h1>
              <p className="text-sm text-slate-500">Reduce DOCX file size by optimizing embedded images and media files</p>
            </div>
          </div>
        </div>

        {/* Action card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          
          {/* Dropzone */}
          <div className="relative">
            <input
              type="file"
              accept=".docx"
              onChange={handleFileChange}
              disabled={compressing}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
              file ? "border-violet-500/50 bg-violet-50/10" : "border-slate-300 hover:border-slate-400 bg-slate-50/30"
            }`}>
              <div className={`mb-4 grid h-12 w-12 place-items-center rounded-full ${
                file ? "bg-violet-500/20 text-violet-600" : "bg-slate-100 text-slate-400"
              }`}>
                <Upload className="h-5 w-5 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {file ? file.name : "Drag & drop Word document, or click to browse"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Supports newer Word files (.docx) up to 50MB
              </p>
              {file && (
                <div className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  Original Size: {formatSize(file.size)}
                </div>
              )}
            </div>
          </div>

          {/* Errors */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-100 p-4 text-rose-700">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-xs font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Compress action */}
          {file && !compressing && !result && (
            <button
              onClick={handleCompress}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700 transition"
            >
              <Sparkles className="h-4 w-4" /> Compress Document
            </button>
          )}

          {/* Loading status */}
          {compressing && (
            <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              <p className="text-sm font-semibold text-slate-700">{statusText}</p>
              <p className="text-xs text-slate-400">This may take up to a minute for documents containing many images...</p>
            </div>
          )}

          {/* Success screen */}
          {result && (
            <div className="rounded-2xl bg-emerald-50/40 border border-emerald-100/50 p-6 space-y-6">
              <div className="flex items-center gap-2.5 text-emerald-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <h3 className="text-sm font-bold">Document Compressed Successfully!</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-white border p-3.5 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Before</div>
                  <div className="mt-1.5 text-sm font-bold text-slate-700">{formatSize(result.originalSize)}</div>
                </div>
                <div className="grid place-items-center">
                  <div className="flex h-8 w-8 place-items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xs">
                    -{result.ratio}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-1">Reduction</div>
                </div>
                <div className="rounded-xl bg-white border p-3.5 text-center border-emerald-500/20">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">After</div>
                  <div className="mt-1.5 text-sm font-bold text-emerald-700">{formatSize(result.compressedSize)}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={result.downloadUrl}
                  download={result.filename}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <Download className="h-4 w-4" /> Download Compressed File
                </a>
                <button
                  onClick={() => { setFile(null); setResult(null); }}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Details / Help card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500 leading-relaxed">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                <p><span className="font-semibold text-slate-700">Image Optimization:</span> Compresses and downscales embedded high-res JPEGs, PNGs, and WebPs inside the document.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                <p><span className="font-semibold text-slate-700">Lossless Text:</span> Keeps all document text, fonts, references, styles, headers, and footnotes completely unchanged.</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                <p><span className="font-semibold text-slate-700">Maximum Zipping:</span> Compresses internal XML directories and files to their maximum zip compression levels.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                <p><span className="font-semibold text-slate-700">Save as .docx first:</span> Legacy .doc files must be saved as newer .docx first to optimize their internal structures.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
