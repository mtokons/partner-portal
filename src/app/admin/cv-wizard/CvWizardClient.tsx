"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  getExpertForCvWizardAction,
  saveCvWizardResultAction,
} from "./actions";
import { buildExpertProfile } from "./profile-builder";

interface ExpertRef { id: string; name: string; email: string; nationality: string; currentLocation: string; level: string }
interface ProjectRef { id: string; name: string }
interface MatrixCriterion { label: string; maxPoints: number }
interface TorOption { id: string; label: string; projectId: string; excerptText: string; bangladeshProject?: boolean; sectorGroups?: Array<{ groupLabel: string; sectors: string[]; mode: "cumulative" | "individual" }> }
interface MatrixOption { id: string; label: string; projectId: string; criteria: MatrixCriterion[] }
interface Section { section: string; original?: string | null; tailored: string; keywords: string[] }
interface MatrixMatch { requirement: string; evidence: string; score: number; max_score: number }
interface TailorResult { expert_name: string; tor_match_pct: number; sections: Section[]; matrix_matches: MatrixMatch[]; provider: string }

const TEMPLATES = [
  { id: "giz",     label: "GIZ Corporate Format",  desc: "Strict multi-page tables" },
  { id: "eu",      label: "Standard EU CV",         desc: "Chronological grid layout" },
  { id: "ucep",    label: "UCEP / UN Format",        desc: "UN-style competency profile" },
  { id: "custom1", label: "Custom CV Format 1",      desc: "Full structured layout (personal info + experience tables)" },
  { id: "latex_modern", label: "LaTeX Modern CV",   desc: "Professional LaTeX compiled PDF" },
];

const STEPS = ["Select Expert", "Context & Format", "Auto-generate & Adjust", "Download & Save"];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
            i === step ? "bg-violet-600 text-white" : i < step ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
            <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold",
              i === step ? "bg-white/25" : i < step ? "bg-emerald-500 text-white" : "bg-slate-300 text-white")}>
              {i < step ? "✓" : i + 1}
            </span>
            {label}
          </div>
          {i < STEPS.length - 1 && <span className="text-slate-300">→</span>}
        </div>
      ))}
    </div>
  );
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded bg-slate-200">
      <div className={cn("h-full rounded", pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CvWizardClient({ experts, projects, torExcerpts, matrices, serviceStatus, preSelectedExpertId }: {
  experts: ExpertRef[]; projects: ProjectRef[]; torExcerpts: TorOption[]; matrices: MatrixOption[]; serviceStatus: "ok" | "unavailable"; preSelectedExpertId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Step 0 — Expert selection
  const [expertId, setExpertId] = useState(preSelectedExpertId || "");
  const [expertData, setExpertData] = useState<Awaited<ReturnType<typeof getExpertForCvWizardAction>> | null>(null);
  const [loadingExpert, setLoadingExpert] = useState(false);

  // Auto-load when pre-selected from profile page
  useEffect(() => {
    if (preSelectedExpertId) selectExpert(preSelectedExpertId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1 — Context
  const [projectId, setProjectId] = useState("");
  const [proposedPosition, setProposedPosition] = useState("");
  const [torExcerptId, setTorExcerptId] = useState("");
  const [matrixId, setMatrixId] = useState("");
  const [templateId, setTemplateId] = useState("giz");
  const [deep, setDeep] = useState(false);

  // Step 2 — Generated + adjusted
  const [result, setResult] = useState<TailorResult | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [matches, setMatches] = useState<MatrixMatch[]>([]);
  const [editMode, setEditMode] = useState<number | null>(null);

  // Step 3 — Saved
  const [savedFileName, setSavedFileName] = useState("");

  const selectedTor = torExcerpts.find((x) => x.id === torExcerptId);
  const selectedMatrix = matrices.find((m) => m.id === matrixId);
  const availableExcerpts = torExcerpts.filter((x) => !projectId || !x.projectId || x.projectId === projectId);
  const availableMatrices = matrices.filter((m) => !projectId || !m.projectId || m.projectId === projectId);
  const totals = useMemo(() => {
    const t = matches.reduce((s, m) => s + (Number(m.score) || 0), 0);
    const mx = matches.reduce((s, m) => s + (Number(m.max_score) || 0), 0);
    return { total: t, max: mx, pct: mx > 0 ? Math.round((t / mx) * 100) : 0 };
  }, [matches]);

  async function selectExpert(id: string) {
    setExpertId(id); setExpertData(null);
    if (!id) return;
    setLoadingExpert(true);
    try {
      const data = await getExpertForCvWizardAction(id);
      setExpertData(data);
      setProposedPosition(data.expert.level || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load expert");
    } finally { setLoadingExpert(false); }
  }

  async function generate() {
    if (!expertData) { setError("Select an expert first."); return; }
    setBusy(true); setError("");
    try {
      const profile = buildExpertProfile(expertData.expert, expertData.evaluations);
      const projectName = projects.find((p) => p.id === projectId)?.name || proposedPosition || "Project";
      const body = {
        expert_name: expertData.expert.expertName,
        nationality: expertData.expert.nationality,
        current_location: expertData.expert.currentLocation,
        level: expertData.expert.level,
        proposed_position: proposedPosition,
        ...profile,
        tor_text: selectedTor?.excerptText || "",
        criteria_json: JSON.stringify(selectedMatrix?.criteria || []),
        project_name: projectName,
        bangladesh_project: selectedTor?.bangladeshProject ?? false,
        sector_groups: selectedTor?.sectorGroups || [],
        deep_analysis: deep,
      };
      const r = await fetch("/api/cv-tailor/tailor-from-json", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.detail || j.error || `HTTP ${r.status}`); }
      const data: TailorResult = await r.json();
      setResult(data); setSections(data.sections || []); setMatches(data.matrix_matches || []);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally { setBusy(false); }
  }

  function updateSection(i: number, patch: Partial<Section>) {
    setSections((prev) => prev.map((s, j) => j === i ? { ...s, ...patch } : s));
  }
  function updateMatch(i: number, patch: Partial<MatrixMatch>) {
    setMatches((prev) => prev.map((m, j) => j === i ? { ...m, ...patch } : m));
  }

  async function saveAndDownload() {
    if (!result || !expertData) return;
    setBusy(true); setError("");
    try {
      const finalResult = { ...result, sections, matrix_matches: matches, tor_match_pct: result.tor_match_pct };
      const res = await saveCvWizardResultAction({
        expertId: expertData.expert.id,
        expertName: expertData.expert.expertName,
        result: finalResult,
        templateId,
        projectId,
        projectName: projects.find((p) => p.id === projectId)?.name || "",
        proposedPosition,
        torExcerptId,
      });
      setSavedFileName(res.fileName);
      // Also trigger client-side download via generate endpoint
      const r = await fetch("/api/cv-tailor/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: finalResult, template_id: templateId }),
      });
      if (r.ok) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = res.fileName; a.click(); URL.revokeObjectURL(url);
      }
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-50/40" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="border-b bg-white px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/30">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </span>
              CV Creation Wizard
            </h1>
            <p className="text-sm text-muted-foreground">Create a tailored CV from stored expert data — zero data loss, guided by project TOR &amp; matrix.</p>
          </div>
          <div className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", serviceStatus === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
            <span className={cn("h-2 w-2 rounded-full", serviceStatus === "ok" ? "bg-emerald-500" : "bg-amber-400")} />
            {serviceStatus === "ok" ? "AI engine live" : "Engine starting…"}
          </div>
        </div>
        <div className="mt-4"><StepBar step={step} /></div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {/* ─── STEP 0: Select Expert ────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Select expert from the Master Bank</h2>
                <p className="text-xs text-slate-500">All stored evaluation data and past tailored sections will be loaded automatically.</p>
              </div>

              <select value={expertId} onChange={(e) => selectExpert(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="">— Select expert —</option>
                {experts.map((e) => <option key={e.id} value={e.id}>{e.name}{e.level ? ` (${e.level})` : ""}</option>)}
              </select>

              {loadingExpert && <p className="text-xs text-slate-400">Loading expert data…</p>}

              {expertData && (
                <div className="rounded-xl border bg-slate-50/60 p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-400">Nationality</span><br /><span className="font-medium">{expertData.expert.nationality || "—"}</span></div>
                    <div><span className="text-slate-400">Current location</span><br /><span className="font-medium">{expertData.expert.currentLocation || "—"}</span></div>
                    <div><span className="text-slate-400">Level</span><br /><span className="font-medium">{expertData.expert.level || "—"}</span></div>
                    <div><span className="text-slate-400">Stored evaluations</span><br /><span className="font-medium text-indigo-700">{expertData.evaluations.length}</span></div>
                  </div>
                  {expertData.evaluations.length > 0 && (
                    <div className="border-t pt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Available data sources</p>
                      <ul className="space-y-1">
                        {expertData.evaluations.slice(0, 3).map((ev, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                            {ev.projectName || "General"} — {ev.percentage}% match — {(ev.result as any)?.sections?.length || 0} sections
                          </li>
                        ))}
                        {expertData.evaluations.length > 3 && <li className="text-xs text-slate-400">+{expertData.evaluations.length - 3} more evaluations</li>}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button disabled={!expertData} onClick={() => setStep(1)}
                  className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 1: Context & Format ─────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">Project context &amp; output format</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Project</span>
                  <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                    <option value="">— Select project —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Proposed position</span>
                  <input value={proposedPosition} onChange={(e) => setProposedPosition(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm" placeholder="e.g. Senior TVET Expert" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">ToR excerpt</span>
                  <select value={torExcerptId} onChange={(e) => setTorExcerptId(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                    <option value="">— None —</option>
                    {availableExcerpts.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Evaluation matrix</span>
                  <select value={matrixId} onChange={(e) => setMatrixId(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                    <option value="">— None —</option>
                    {availableMatrices.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </label>
              </div>

              {selectedTor?.bangladeshProject && (
                <p className="rounded bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">🇧🇩 Bangladesh project — non-BD experience counts as international</p>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600">Output format</p>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map((t) => (
                    <button key={t.id} onClick={() => setTemplateId(t.id)}
                      className={cn("rounded-xl border p-3 text-left text-xs transition-all",
                        templateId === t.id ? "border-violet-600 bg-violet-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300")}>
                      <div className={cn("font-semibold", templateId === t.id ? "text-violet-800" : "text-slate-800")}>{t.label}</div>
                      <div className="mt-0.5 text-slate-500">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} className="h-4 w-4" />
                Deep analysis <span className="text-xs text-slate-400">(more thorough, infers competencies from context)</span>
              </label>

              <div className="flex justify-between">
                <button onClick={() => setStep(0)} className="rounded-xl border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">← Back</button>
                <button disabled={busy} onClick={generate}
                  className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
                  {busy ? "Generating…" : "Generate CV"}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Adjust ──────────────────────────────────────── */}
          {step === 2 && result && (
            <div className="space-y-5">
              <div className="rounded-2xl border bg-gradient-to-br from-violet-50/70 to-purple-50/50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">TOR match</p>
                    <p className="text-2xl font-bold text-violet-700">{Math.round(result.tor_match_pct)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Matrix score</p>
                    <p className="text-lg font-bold text-slate-800">{totals.total}/{totals.max} ({totals.pct}%)</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">via {result.provider}</span>
                </div>
              </div>

              {/* Editable CV sections — two-column side-by-side with Original vs Tailored */}
              <div className="rounded-2xl border bg-white p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">CV sections — adjust as needed</h3>
                <p className="text-xs text-slate-400">Click on any section to edit the tailored content. Original text shown for reference.</p>
                {sections.map((s, i) => (
                  <div key={i} className="rounded-xl border bg-slate-50/60">
                    <button className="flex w-full items-center justify-between px-4 py-2.5 text-left" onClick={() => setEditMode(editMode === i ? null : i)}>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700">{s.section}</span>
                      <div className="flex gap-1">
                        {s.keywords.slice(0, 3).map((k) => <span key={k} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">{k}</span>)}
                        <span className="text-xs text-slate-400">{editMode === i ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {editMode === i && (
                      <div className="border-t px-4 pb-4 pt-3 space-y-2">
                        {s.original && (
                          <div className="rounded-lg bg-slate-100 p-2 text-[11px] italic text-slate-500">
                            <span className="font-semibold text-slate-400">Original: </span>{s.original}
                          </div>
                        )}
                        <textarea rows={6} value={s.tailored} onChange={(e) => updateSection(i, { tailored: e.target.value })}
                          className="w-full rounded-lg border bg-white p-2 text-xs text-slate-700 focus:border-violet-400 focus:outline-none" />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">Keywords:</span>
                          <input value={s.keywords.join(", ")} onChange={(e) => updateSection(i, { keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
                            className="flex-1 rounded border bg-white px-2 py-1 text-[11px]" placeholder="keyword1, keyword2" />
                        </div>
                      </div>
                    )}
                    {editMode !== i && (
                      <p className="line-clamp-2 px-4 pb-3 text-xs text-slate-600">{s.tailored}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Evaluation matrix alignment */}
              <div className="rounded-2xl border bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Matrix alignment</h3>
                <div className="space-y-2">
                  {matches.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border bg-slate-50/60 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-slate-700">{m.requirement}</p>
                        <p className="text-[11px] italic text-slate-500 mt-0.5">{m.evidence}</p>
                        <ScoreBar score={m.score} max={m.max_score} />
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-mono font-bold text-slate-700">{m.score}/{m.max_score}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="rounded-xl border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">← Regenerate</button>
                <button disabled={busy} onClick={saveAndDownload}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:opacity-95 disabled:opacity-40">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  {busy ? "Saving…" : "Download & save to bank"}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Done ────────────────────────────────────────── */}
          {step === 3 && (
            <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-violet-100 text-violet-600">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800">CV saved</h2>
              <p className="mt-1 text-sm text-slate-500">
                <strong>{expertData?.expert.expertName}</strong>'s tailored CV (<span className="font-mono text-xs">{savedFileName}</span>)
                is saved in SharePoint and registered in the Master Expert Bank.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button onClick={() => router.push("/admin/expert-bank")}
                  className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90">Open Master Expert Bank</button>
                <button onClick={() => { setStep(0); setExpertId(""); setExpertData(null); setResult(null); setSections([]); setMatches([]); }}
                  className="rounded-xl border px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Create another CV</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
