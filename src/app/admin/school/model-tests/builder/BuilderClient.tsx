"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Wand2,
  Upload,
  ListChecks,
  PencilRuler,
  FileDown,
  Loader2,
  CircleCheck,
  CircleAlert,
} from "lucide-react";

const API_BASE = "/api/model-test/api/wizard";

type SourceType = "html" | "text" | "url" | "pdf" | "docx";

const STEPS = [
  { n: 1, label: "Ingest", icon: Upload },
  { n: 2, label: "Structure", icon: ListChecks },
  { n: 3, label: "Verify", icon: PencilRuler },
  { n: 4, label: "Export", icon: FileDown },
] as const;

export default function BuilderClient() {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [sourceType, setSourceType] = useState<SourceType>("html");
  const [payload, setPayload] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sourceNote, setSourceNote] = useState("Own authoring");
  const [jobId, setJobId] = useState<string | null>(null);

  // Step 2/3/4
  const [examId, setExamId] = useState<string | null>(null);
  const [exam, setExam] = useState<Record<string, unknown> | null>(null);
  const [overrides, setOverrides] = useState("{}");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {};
    if (!(init?.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${API_BASE}${path}`, {
      headers,
      ...init,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        typeof data?.detail === "string" ? data.detail : data?.error || `Request failed (${res.status})`,
      );
    }
    return data as T;
  }

  // ── Step 1: ingest + poll ──────────────────────────────────────────────
  async function startIngest() {
    setBusy(true);
    setError("");
    clearPoll();
    try {
      let job_id: string;
      if (sourceType === "pdf" || sourceType === "docx") {
        if (!file) throw new Error("Please select a file to upload.");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("source_note", sourceNote);
        const res = await api<{ job_id: string }>("/step1-ingest-file", {
          method: "POST",
          body: formData,
        });
        job_id = res.job_id;
      } else {
        const res = await api<{ job_id: string }>("/step1-ingest", {
          method: "POST",
          body: JSON.stringify({ source_type: sourceType, payload, source_note: sourceNote }),
        });
        job_id = res.job_id;
      }
      setJobId(job_id);

      // Poll status until ready/failed.
      await new Promise<void>((resolve, reject) => {
        pollRef.current = setInterval(async () => {
          try {
            const s = await api<{ status: string; error?: string }>(
              `/step1-ingest/${job_id}/status`,
            );
            if (s.status === "ready") {
              clearPoll();
              resolve();
            } else if (s.status === "failed") {
              clearPoll();
              reject(new Error(s.error || "Ingestion failed"));
            }
          } catch (e) {
            clearPoll();
            reject(e as Error);
          }
        }, 1200);
      });

      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ── Step 2: structure + validate ───────────────────────────────────────
  async function structure() {
    if (!jobId) return;
    setBusy(true);
    setError("");
    try {
      const res = await api<{ exam_id: string; exam: Record<string, unknown> }>(
        `/step2-structure/${jobId}`,
      );
      setExamId(res.exam_id);
      setExam(res.exam);
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ── Step 3: verify / override ──────────────────────────────────────────
  async function verify() {
    if (!examId) return;
    setBusy(true);
    setError("");
    try {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(overrides || "{}");
      } catch {
        throw new Error("Overrides must be valid JSON.");
      }
      const updated = await api<Record<string, unknown>>(`/step3-verify/${examId}`, {
        method: "PUT",
        body: JSON.stringify({ overrides: parsed }),
      });
      setExam(updated);
      setStep(4);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ── Step 4: export ─────────────────────────────────────────────────────
  async function exportExam() {
    if (!examId) return;
    setBusy(true);
    setError("");
    try {
      const res = await api<Record<string, unknown>>(`/step4-export/${examId}`);
      setExam(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function downloadJson() {
    if (!exam) return;
    const blob = new Blob([JSON.stringify(exam, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${examId || "model-test"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Wand2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Model Test Builder</h1>
            <p className="text-sm text-muted-foreground">
              Build a telc Deutsch A2-B1 model test in four steps.
            </p>
          </div>
        </div>
        <Link
          href="/admin/school/model-tests"
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {STEPS.map(({ n, label, icon: Icon }, i) => {
          const state = step === n ? "current" : step > n ? "done" : "todo";
          return (
            <li key={n} className="flex flex-1 items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${
                  state === "current"
                    ? "border-primary bg-primary/5 text-primary"
                    : state === "done"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "text-muted-foreground"
                }`}
              >
                {state === "done" ? <CircleCheck className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                <span className="hidden sm:inline">
                  {n}. {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Step body */}
      <div className="rounded-2xl border bg-card p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Step 1 — Ingest source content</h2>
            <p className="text-sm text-muted-foreground">
              Provide material you own or have licensed. URLs are fetched only if the target&apos;s
              robots.txt permits it.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Source type</span>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as SourceType)}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="html">HTML (uploaded/authored)</option>
                  <option value="text">Plain text</option>
                  <option value="url">URL (licensed/owned)</option>
                  <option value="pdf">PDF file</option>
                  <option value="docx">Word document (DOCX)</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Source / licence note</span>
                <input
                  value={sourceNote}
                  onChange={(e) => setSourceNote(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="e.g. Own authoring"
                />
              </label>
            </div>
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                {sourceType === "url"
                  ? "URL"
                  : sourceType === "pdf" || sourceType === "docx"
                    ? "Upload File"
                    : "Content"}
              </span>
              {sourceType === "url" ? (
                <input
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="https://your-licensed-source.example/exam"
                />
              ) : sourceType === "pdf" || sourceType === "docx" ? (
                <input
                  type="file"
                  accept={sourceType === "pdf" ? ".pdf" : ".docx"}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border px-3 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              ) : (
                <textarea
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg border px-3 py-2 font-mono text-xs"
                  placeholder="Paste your HTML or text here…"
                />
              )}
            </label>
            <button
              onClick={startIngest}
              disabled={busy || ((sourceType === "pdf" || sourceType === "docx") ? !file : !payload.trim())}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? "Ingesting…" : "Start ingest"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Step 2 — Map & validate</h2>
            <p className="text-sm text-muted-foreground">
              Job <code className="rounded bg-muted px-1">{jobId}</code> is ready. Map the parsed
              content into the telc schema and validate it.
            </p>
            <button
              onClick={structure}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
              Structure & validate
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Step 3 — Verify & fine-tune</h2>
            <p className="text-sm text-muted-foreground">
              Exam <code className="rounded bg-muted px-1">{examId}</code>. Apply overrides as a JSON
              patch (deep-merged and re-validated). Placeholder fields are marked{" "}
              <code className="rounded bg-muted px-1">[TO BE COMPLETED BY EDITOR]</code>.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <span className="mb-1 block text-sm font-medium">Current exam</span>
                <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-3 text-[11px]">
                  {JSON.stringify(exam, null, 2)}
                </pre>
              </div>
              <div>
                <span className="mb-1 block text-sm font-medium">Overrides (JSON)</span>
                <textarea
                  value={overrides}
                  onChange={(e) => setOverrides(e.target.value)}
                  rows={16}
                  className="w-full rounded-lg border px-3 py-2 font-mono text-[11px]"
                  placeholder='{ "metadata": { "title": "…" } }'
                />
              </div>
            </div>
            <button
              onClick={verify}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilRuler className="h-4 w-4" />}
              Apply & validate
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Step 4 — Export</h2>
            <p className="text-sm text-muted-foreground">
              The verified module is ready for front-end rendering. Download the JSON or compile a PDF.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportExam}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
                Refresh
              </button>
              <button
                onClick={downloadJson}
                disabled={!exam}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <FileDown className="h-4 w-4" /> Download JSON
              </button>
              {examId && (
                <a
                  href={`${API_BASE}/step4-export/${examId}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted"
                >
                  <FileDown className="h-4 w-4" /> PDF (stub)
                </a>
              )}
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 text-[11px]">
              {JSON.stringify(exam, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
