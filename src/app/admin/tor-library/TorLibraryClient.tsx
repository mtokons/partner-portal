"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { TorExcerpt, TorExcerptStructure } from "@/lib/tor-excerpts";
import type { EvaluationMatrix, MatrixCriterion } from "@/lib/eval-matrices";
import {
  saveTorExcerptAction,
  deleteTorExcerptAction,
  saveEvaluationMatrixAction,
  deleteEvaluationMatrixAction,
} from "./actions";

interface ProjectRef { id: string; name: string }

// ── ToR extraction result from FastAPI ──────────────────────────────────────
interface TorExtract extends TorExcerptStructure {
  raw_text?: string;
  filename?: string;
  provider?: string;
}
// ── Matrix extraction result ────────────────────────────────────────────────
interface MatrixRole { role: string; criteria: MatrixCriterion[] }
interface MatrixExtract {
  matrices: MatrixRole[];
  raw_text?: string;
  filename?: string;
  provider?: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

export default function TorLibraryClient({
  projects, excerpts, matrices, serviceStatus,
}: {
  projects: ProjectRef[];
  excerpts: TorExcerpt[];
  matrices: EvaluationMatrix[];
  serviceStatus: "ok" | "unavailable";
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"tor" | "matrix">("tor");

  return (
    <div className="flex h-full min-h-screen flex-col">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">ToR Library</h1>
            <p className="text-sm text-muted-foreground">Upload Terms of Reference and evaluation matrices, extract structured data with AI, and save per project &amp; role for use in CV Tailor.</p>
          </div>
          <div className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", serviceStatus === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
            <span className={cn("h-2 w-2 rounded-full", serviceStatus === "ok" ? "bg-emerald-500" : "bg-amber-400")} />
            {serviceStatus === "ok" ? "AI extractor live" : "Extractor starting…"}
          </div>
        </div>
        <div className="mt-4 flex gap-2 border-b">
          {(["tor", "matrix"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors", tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-muted-foreground hover:text-slate-700")}>
              {t === "tor" ? `ToR Excerpts (${excerpts.length})` : `Evaluation Matrices (${matrices.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Format guidance banner */}
      <div className="border-b bg-blue-50/60 px-6 py-2.5">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Best results:</span> for accurate extraction, use a <span className="font-medium">selectable-text PDF or DOCX</span> (not scanned).
          Scanned documents &amp; photos are read with OCR (upload as PNG/JPG). You can also <span className="font-medium">paste the text directly</span> — often the most reliable for evaluation matrices.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/40 p-6">
        {tab === "tor"
          ? <TorPanel projects={projects} excerpts={excerpts} onSaved={() => router.refresh()} />
          : <MatrixPanel projects={projects} matrices={matrices} onSaved={() => router.refresh()} />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ToR panel
// ════════════════════════════════════════════════════════════════════════════
function TorPanel({ projects, excerpts, onSaved }: { projects: ProjectRef[]; excerpts: TorExcerpt[]; onSaved: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [extract, setExtract] = useState<TorExtract | null>(null);
  const [mode, setMode] = useState<"file" | "text">("file");
  const [pasteText, setPasteText] = useState("");

  // Editable save form
  const [projectId, setProjectId] = useState("");
  const [role, setRole] = useState("");
  const [position, setPosition] = useState("");
  const [summary, setSummary] = useState("");
  const [excerptText, setExcerptText] = useState("");
  const [bangladeshProject, setBangladeshProject] = useState(false);
  const [sectorMode, setSectorMode] = useState<"cumulative" | "individual">("cumulative");
  const [sectorLabel, setSectorLabel] = useState("");
  const [sectorGroups, setSectorGroups] = useState<Array<{ groupLabel: string; sectors: string[]; mode: "cumulative" | "individual" }>>([]);

  function applyExtract(data: TorExtract) {
    setExtract(data);
    setPosition(data.position || "");
    setRole(data.position || "");
    setSummary(data.summary || "");
    setExcerptText(data.excerpt_text || "");
    const lowerExcerpt = (data.excerpt_text || data.summary || "").toLowerCase();
    setBangladeshProject(/bangladesh|dhaka|chittagong|khulna|sylhet/.test(lowerExcerpt));
  }

  async function handleFile(f: File) {
    setError(""); setExtracting(true); setExtract(null); setFileName(f.name);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/cv-tailor/extract-tor", { method: "POST", body: fd });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || j.detail || `HTTP ${r.status}`); }
      applyExtract(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally { setExtracting(false); }
  }

  async function handlePasteText() {
    if (!pasteText.trim()) { setError("Paste some ToR text first."); return; }
    setError(""); setExtracting(true); setExtract(null); setFileName("pasted-text.txt");
    try {
      const fd = new FormData();
      fd.append("raw_text", pasteText);
      const r = await fetch("/api/cv-tailor/extract-tor", { method: "POST", body: fd });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || j.detail || `HTTP ${r.status}`); }
      applyExtract(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally { setExtracting(false); }
  }

  function save() {
    setError("");
    startTransition(async () => {
      try {
        const project = projects.find((p) => p.id === projectId);
        await saveTorExcerptAction({
          projectId,
          projectName: project?.name || "",
          role,
          position,
          fileName,
          summary,
          excerptText,
          structure: {
            position,
            summary,
            required_qualifications: extract?.required_qualifications || [],
            key_tasks: extract?.key_tasks || [],
            excerpt_text: excerptText,
            bangladeshProject,
            sectorGroups: sectorGroups.length ? sectorGroups : undefined,
          },
          rawText: extract?.raw_text || "",
          provider: extract?.provider || "",
        });
        // reset form
        setExtract(null); setFileName(""); setSummary(""); setExcerptText(""); setRole(""); setPosition("");
        setBangladeshProject(false); setSectorGroups([]);
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Upload + extract + save */}
      <div className="space-y-4 rounded-xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800">Add ToR</h2>

        {/* Input mode toggle */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
          <button onClick={() => setMode("file")} className={cn("flex-1 rounded-md px-2 py-1.5 transition-colors", mode === "file" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500")}>Upload File / Image</button>
          <button onClick={() => setMode("text")} className={cn("flex-1 rounded-md px-2 py-1.5 transition-colors", mode === "text" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500")}>Paste Text</button>
        </div>

        {mode === "file" ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            className="cursor-pointer rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-6 text-center hover:border-blue-400"
          >
            <p className="text-sm font-medium text-slate-700">{fileName || "Drag & Drop or click to upload"}</p>
            <p className="mt-1 text-xs text-slate-400">PDF, DOCX, or image (PNG/JPG — scanned docs use OCR)</p>
            <input ref={inputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        ) : (
          <div className="space-y-2">
            <textarea rows={6} value={pasteText} onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste the full Terms of Reference text here…"
              className="w-full rounded-xl border bg-white p-3 text-xs focus:border-blue-400 focus:outline-none" />
            <button onClick={handlePasteText} disabled={extracting}
              className="w-full rounded-lg bg-blue-600 p-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">
              {extracting ? "Extracting…" : "Extract from text"}
            </button>
          </div>
        )}

        {extracting && <p className="text-xs text-blue-600">Extracting ToR excerpt with AI…</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}

        {extract && (
          <div className="space-y-3 border-t pt-4">
            <Field label="Project">
              <select className="w-full rounded-lg border bg-white px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">— No project / general —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Role / Header name">
              <input className="w-full rounded-lg border bg-white px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Team Leader" />
            </Field>
            <Field label="Position (from ToR)">
              <input className="w-full rounded-lg border bg-white px-3 py-2 text-sm" value={position} onChange={(e) => setPosition(e.target.value)} />
            </Field>
            <Field label="Summary">
              <textarea rows={2} className="w-full rounded-lg border bg-white p-3 text-xs" value={summary} onChange={(e) => setSummary(e.target.value)} />
            </Field>
            <Field label="Excerpt (used for CV tailoring)">
              <textarea rows={6} className="w-full rounded-lg border bg-white p-3 text-xs" value={excerptText} onChange={(e) => setExcerptText(e.target.value)} />
            </Field>
            {/* Bangladesh project flag */}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input type="checkbox" className="h-4 w-4 rounded" checked={bangladeshProject} onChange={(e) => setBangladeshProject(e.target.checked)} />
              Bangladesh project
              <span className="font-normal text-slate-400">(non-BD experience counts as international)</span>
            </label>
            {/* Sector groups */}
            <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700">Sector experience groups <span className="font-normal text-slate-400">(optional)</span></p>
              {sectorGroups.map((g, gi) => (
                <div key={gi} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate text-slate-700">{g.groupLabel} — {g.mode}</span>
                  <button type="button" onClick={() => setSectorGroups((p) => p.filter((_, i) => i !== gi))} className="text-red-500 hover:text-red-700">✕</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded border bg-white px-2 py-1 text-xs"
                  placeholder="Group label, e.g. TVET / Vocational Training"
                  value={sectorLabel}
                  onChange={(e) => setSectorLabel(e.target.value)}
                />
                <select className="rounded border bg-white px-2 py-1 text-xs" value={sectorMode} onChange={(e) => setSectorMode(e.target.value as "cumulative" | "individual")}>
                  <option value="cumulative">Cumulative (sum years)</option>
                  <option value="individual">Individual (each sector separate)</option>
                </select>
                <button type="button"
                  className="rounded bg-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-300"
                  onClick={() => {
                    if (!sectorLabel.trim()) return;
                    setSectorGroups((p) => [...p, { groupLabel: sectorLabel.trim(), sectors: sectorLabel.trim().split(/[/,]+/).map((s) => s.trim()).filter(Boolean), mode: sectorMode }]);
                    setSectorLabel("");
                  }}>+ Add</button>
              </div>
            </div>
            {!!extract.required_qualifications?.length && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase text-slate-500">Required qualifications</p>
                <ul className="list-inside list-disc text-xs text-slate-600">
                  {extract.required_qualifications.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}
            <button disabled={pending} onClick={save}
              className="w-full rounded-xl bg-blue-600 p-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
              {pending ? "Saving…" : "Save ToR Excerpt"}
            </button>
          </div>
        )}
      </div>

      {/* Existing excerpts */}
      <div className="space-y-3 rounded-xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800">Saved ToR Excerpts</h2>
        {excerpts.length === 0
          ? <p className="text-xs text-slate-400">No excerpts saved yet.</p>
          : <ul className="space-y-2">
              {excerpts.map((x) => <ExcerptRow key={x.id} x={x} onDeleted={onSaved} />)}
            </ul>}
      </div>
    </div>
  );
}

function ExcerptRow({ x, onDeleted }: { x: TorExcerpt; onDeleted: () => void }) {
  const [pending, startTransition] = useTransition();
  const isBD = x.structure?.bangladeshProject;
  const sectorCount = x.structure?.sectorGroups?.length ?? 0;
  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-800">{x.role || x.position || "ToR Excerpt"}</p>
          <p className="text-xs text-slate-500">{x.projectName || "General"} · {x.fileName}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {isBD && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">🇧🇩 Bangladesh</span>}
            {sectorCount > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">{sectorCount} sector group{sectorCount > 1 ? "s" : ""}</span>}
          </div>
          {x.summary && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{x.summary}</p>}
        </div>
        <button disabled={pending} onClick={() => startTransition(async () => { await deleteTorExcerptAction(x.id); onDeleted(); })}
          className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
      </div>
    </li>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Matrix panel
// ════════════════════════════════════════════════════════════════════════════
function MatrixPanel({ projects, matrices, onSaved }: { projects: ProjectRef[]; matrices: EvaluationMatrix[]; onSaved: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [extract, setExtract] = useState<MatrixExtract | null>(null);
  const [roles, setRoles] = useState<MatrixRole[]>([]);
  const [projectId, setProjectId] = useState("");
  const [mode, setMode] = useState<"file" | "text">("file");
  const [pasteText, setPasteText] = useState("");

  async function handleFile(f: File) {
    setError(""); setExtracting(true); setExtract(null); setRoles([]); setFileName(f.name);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/cv-tailor/extract-matrix", { method: "POST", body: fd });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || j.detail || `HTTP ${r.status}`); }
      const data: MatrixExtract = await r.json();
      setExtract(data);
      setRoles(data.matrices || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally { setExtracting(false); }
  }

  async function handlePasteText() {
    if (!pasteText.trim()) { setError("Paste some matrix text first."); return; }
    setError(""); setExtracting(true); setExtract(null); setRoles([]); setFileName("pasted-text.txt");
    try {
      const fd = new FormData();
      fd.append("raw_text", pasteText);
      const r = await fetch("/api/cv-tailor/extract-matrix", { method: "POST", body: fd });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || j.detail || `HTTP ${r.status}`); }
      const data: MatrixExtract = await r.json();
      setExtract(data);
      setRoles(data.matrices || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally { setExtracting(false); }
  }

  function updateCriterion(ri: number, ci: number, patch: Partial<MatrixCriterion>) {
    setRoles((prev) => prev.map((r, i) => i !== ri ? r : {
      ...r, criteria: r.criteria.map((c, j) => j !== ci ? c : { ...c, ...patch }),
    }));
  }
  function updateRoleName(ri: number, name: string) {
    setRoles((prev) => prev.map((r, i) => i !== ri ? r : { ...r, role: name }));
  }

  function saveRole(ri: number) {
    setError("");
    const roleData = roles[ri];
    startTransition(async () => {
      try {
        const project = projects.find((p) => p.id === projectId);
        await saveEvaluationMatrixAction({
          projectId,
          projectName: project?.name || "",
          role: roleData.role,
          fileName,
          criteria: roleData.criteria,
          rawText: extract?.raw_text || "",
          provider: extract?.provider || "",
        });
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800">Add evaluation matrix</h2>
        <p className="text-xs text-slate-500">A single source may contain several roles — each is extracted as its own matrix.</p>

        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
          <button onClick={() => setMode("file")} className={cn("flex-1 rounded-md px-2 py-1.5 transition-colors", mode === "file" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500")}>Upload File / Image</button>
          <button onClick={() => setMode("text")} className={cn("flex-1 rounded-md px-2 py-1.5 transition-colors", mode === "text" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500")}>Paste Text</button>
        </div>

        {mode === "file" ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            className="cursor-pointer rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-6 text-center hover:border-blue-400"
          >
            <p className="text-sm font-medium text-slate-700">{fileName || "Drag & Drop or click to upload"}</p>
            <p className="mt-1 text-xs text-slate-400">PDF, DOCX, or image (PNG/JPG — scanned docs use OCR)</p>
            <input ref={inputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        ) : (
          <div className="space-y-2">
            <textarea rows={6} value={pasteText} onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste the evaluation / staffing matrix text here…"
              className="w-full rounded-xl border bg-white p-3 text-xs focus:border-blue-400 focus:outline-none" />
            <button onClick={handlePasteText} disabled={extracting}
              className="w-full rounded-lg bg-blue-600 p-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">
              {extracting ? "Extracting…" : "Extract from text"}
            </button>
          </div>
        )}

        {extracting && <p className="text-xs text-blue-600">Extracting evaluation matrices with AI…</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}

        {!!roles.length && (
          <div className="space-y-4 border-t pt-4">
            <Field label="Project">
              <select className="w-full rounded-lg border bg-white px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">— No project / general —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            {roles.map((r, ri) => (
              <div key={ri} className="rounded-xl border bg-slate-50/50 p-4">
                <Field label="Role">
                  <input className="w-full rounded-lg border bg-white px-3 py-2 text-sm font-medium" value={r.role} onChange={(e) => updateRoleName(ri, e.target.value)} />
                </Field>
                <div className="mt-3 space-y-2">
                  {r.criteria.map((c, ci) => (
                    <div key={ci} className="flex items-center gap-2">
                      <input className="flex-1 rounded border bg-white px-2 py-1 text-xs" value={c.label} onChange={(e) => updateCriterion(ri, ci, { label: e.target.value })} />
                      <input type="number" className="w-16 rounded border bg-white px-2 py-1 text-xs" value={c.maxPoints} onChange={(e) => updateCriterion(ri, ci, { maxPoints: Number(e.target.value) })} />
                    </div>
                  ))}
                </div>
                <button disabled={pending} onClick={() => saveRole(ri)}
                  className="mt-3 w-full rounded-lg bg-blue-600 p-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">
                  {pending ? "Saving…" : `Save "${r.role || "role"}" matrix`}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800">Saved Evaluation Matrices</h2>
        {matrices.length === 0
          ? <p className="text-xs text-slate-400">No matrices saved yet.</p>
          : <ul className="space-y-2">
              {matrices.map((m) => <MatrixRow key={m.id} m={m} onDeleted={onSaved} />)}
            </ul>}
      </div>
    </div>
  );
}

function MatrixRow({ m, onDeleted }: { m: EvaluationMatrix; onDeleted: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-800">{m.role || "Evaluation Matrix"}</p>
          <p className="text-xs text-slate-500">{m.projectName || "General"} · {m.criteria.length} criteria · {m.maxTotal} pts</p>
        </div>
        <button disabled={pending} onClick={() => startTransition(async () => { await deleteEvaluationMatrixAction(m.id); onDeleted(); })}
          className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
      </div>
    </li>
  );
}
