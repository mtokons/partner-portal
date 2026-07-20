"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { analyzeBankCvAction, getExpertCvOptionsAction, saveWizardEvaluationAction } from "./actions";

interface ProjectRef { id: string; name: string }
interface ExpertRef { id: string; name: string; email: string; nationality: string; currentLocation: string; level: string; status: string }
interface MatrixCriterion { label: string; maxPoints: number }
interface TorOption { id: string; label: string; projectId: string; excerptText: string; bangladeshProject?: boolean; sectorGroups?: Array<{ groupLabel: string; sectors: string[]; mode: "cumulative" | "individual" }> }
interface MatrixOption { id: string; label: string; projectId: string; criteria: MatrixCriterion[] }
interface MatrixMatch { requirement: string; evidence: string; score: number; max_score: number }
interface TailorResult {
  expert_name: string; tor_match_pct: number;
  sections: { section: string; original?: string | null; tailored: string; keywords: string[] }[];
  matrix_matches: MatrixMatch[]; provider: string;
}

const STEPS = ["Expert & Context", "Upload & Analyse", "Adjust Report", "Confirm & Save"];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
            i === step ? "bg-indigo-600 text-white" : i < step ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
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

export default function EvaluationWizardClient({ projects, experts, torExcerpts, matrices, serviceStatus, preSelectedExpertId }: {
  projects: ProjectRef[]; experts: ExpertRef[]; torExcerpts: TorOption[]; matrices: MatrixOption[]; serviceStatus: "ok" | "unavailable"; preSelectedExpertId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Step 1 — identity + context
  const [existingExpertId, setExistingExpertId] = useState(preSelectedExpertId || "");
  const [expertName, setExpertName] = useState("");
  const [email, setEmail] = useState("");
  const [nationality, setNationality] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [level, setLevel] = useState("");
  const [projectId, setProjectId] = useState("");
  const [proposedPosition, setProposedPosition] = useState("");
  const [torExcerptId, setTorExcerptId] = useState("");
  const [matrixId, setMatrixId] = useState("");

  // Step 2 — CV + analysis
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [existingCvId, setExistingCvId] = useState("");
  const [existingCvs, setExistingCvs] = useState<Array<{ id: string; fileName: string; format: string; createdAt: string }>>([]);
  const [loadingExistingCvs, setLoadingExistingCvs] = useState(false);
  const [deep, setDeep] = useState(false);
  const [result, setResult] = useState<TailorResult | null>(null);

  // Step 3 — adjustable
  const [matches, setMatches] = useState<MatrixMatch[]>([]);
  const [strengths, setStrengths] = useState("");
  const [gaps, setGaps] = useState("");
  const [torAnalysis, setTorAnalysis] = useState("");
  const [adjusted, setAdjusted] = useState(false);

  // Step 4 result
  const [savedExpertId, setSavedExpertId] = useState("");

  const availableExcerpts = torExcerpts.filter((x) => !projectId || !x.projectId || x.projectId === projectId);
  const availableMatrices = matrices.filter((m) => !projectId || !m.projectId || m.projectId === projectId);
  const selectedTor = torExcerpts.find((x) => x.id === torExcerptId);
  const selectedMatrix = matrices.find((m) => m.id === matrixId);

  const totals = useMemo(() => {
    const total = matches.reduce((s, m) => s + (Number(m.score) || 0), 0);
    const max = matches.reduce((s, m) => s + (Number(m.max_score) || 0), 0);
    return { total, max, pct: max > 0 ? Math.round((total / max) * 100) : 0 };
  }, [matches]);

  useEffect(() => {
    if (!existingExpertId) {
      setExistingCvs([]); setExistingCvId(""); return;
    }
    let mounted = true;
    setLoadingExistingCvs(true);
    getExpertCvOptionsAction(existingExpertId).then((cvs) => {
      if (!mounted) return;
      setExistingCvs(cvs.map((cv) => ({ id: cv.id, fileName: cv.fileName, format: cv.format, createdAt: cv.createdAt })));
      if (cvs.length > 0) setExistingCvId((prev) => prev || cvs[0].id);
    }).finally(() => { if (mounted) setLoadingExistingCvs(false); });
    return () => { mounted = false; };
  }, [existingExpertId]);

  function pickExisting(id: string) {
    setExistingExpertId(id);
    const e = experts.find((x) => x.id === id);
    if (e) {
      setExpertName(e.name); setEmail(e.email); setNationality(e.nationality);
      setCurrentLocation(e.currentLocation); setLevel(e.level);
    }
  }

  function computeInsights(r: TailorResult): { strengths: string; gaps: string; torAnalysis: string } {
    const mm = r.matrix_matches || [];
    const total = mm.reduce((s, m) => s + (Number(m.score) || 0), 0);
    const max = mm.reduce((s, m) => s + (Number(m.max_score) || 0), 0);
    const pct = max > 0 ? Math.round((total / max) * 100) : Math.round(r.tor_match_pct || 0);
    const s = mm.filter((m) => m.max_score && m.score / m.max_score >= 0.7).map((m) => `• ${m.requirement}: ${m.evidence}`).join("\n");
    const g = mm.filter((m) => !m.max_score || m.score / m.max_score < 0.5).map((m) => `• ${m.requirement} (scored ${m.score}/${m.max_score})`).join("\n");
    const strong = mm.filter((m) => m.max_score && m.score / m.max_score >= 0.7).length;
    const gapCount = mm.filter((m) => !m.max_score || m.score / m.max_score < 0.5).length;
    return { strengths: s, gaps: g, torAnalysis: `TOR match ${Math.round(r.tor_match_pct || pct)}% · Matrix ${total}/${max} (${pct}%). ${strong} strong criteria, ${gapCount} gaps.` };
  }

  async function runAnalysis() {
    if (!existingExpertId && !cvFile) { setError("Please upload a CV or pick an existing CV from the bank."); return; }
    setError(""); setBusy(true);
    try {
      const criteria = selectedMatrix?.criteria || [];
      const projectName = projects.find((p) => p.id === projectId)?.name || proposedPosition || "Project";
      let data: TailorResult;
      if (existingCvId) {
        data = await analyzeBankCvAction({
          cvId: existingCvId,
          torText: selectedTor?.excerptText || "",
          criteriaJson: JSON.stringify(criteria),
          projectName,
          bangladeshProject: Boolean(selectedTor?.bangladeshProject ?? false),
          sectorGroupsJson: JSON.stringify(selectedTor?.sectorGroups || []),
          deepAnalysis: deep,
        });
      } else {
        const fd = new FormData();
        fd.append("cv_file", cvFile as File);
        fd.append("tor_text", selectedTor?.excerptText || "");
        fd.append("criteria_json", JSON.stringify(criteria));
        fd.append("project_name", projectName);
        fd.append("bangladesh_project", String(selectedTor?.bangladeshProject ?? false));
        fd.append("sector_groups_json", JSON.stringify(selectedTor?.sectorGroups || []));
        fd.append("deep_analysis", String(deep));
        const r = await fetch("/api/cv-tailor/tailor", { method: "POST", body: fd });
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || `HTTP ${r.status}`); }
        data = await r.json();
      }
      setResult(data);
      setMatches(data.matrix_matches || []);
      if (!expertName && data.expert_name) setExpertName(data.expert_name);
      const ins = computeInsights(data);
      setStrengths(ins.strengths); setGaps(ins.gaps); setTorAnalysis(ins.torAnalysis);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally { setBusy(false); }
  }

  function updateMatch(i: number, patch: Partial<MatrixMatch>) {
    setAdjusted(true);
    setMatches((prev) => prev.map((m, j) => j === i ? { ...m, ...patch } : m));
  }

  async function save() {
    setError(""); setBusy(true);
    try {
      const res = await saveWizardEvaluationAction({
        expertId: existingExpertId || undefined,
        expertName: expertName.trim(),
        email, nationality, currentLocation, level,
        projectId, projectName: projects.find((p) => p.id === projectId)?.name || "",
        proposedPosition, matrixId, torExcerptId,
        result: result || {},
        matrixMatches: matches,
        strengths, gaps, torAnalysis,
        torMatchPct: result?.tor_match_pct || totals.pct,
        adjusted,
        cvId: existingCvId || undefined,
        cvFileName: existingCvs.find((cv) => cv.id === existingCvId)?.fileName || cvFile?.name || "",
        cvFormat: existingCvs.find((cv) => cv.id === existingCvId)?.format || "",
      });
      setSavedExpertId(res.expertId);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(false); }
  }

  const canProceedStep0 = !!expertName.trim() && (!!projectId || !!proposedPosition);

  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-50/40" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="border-b bg-white px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              </span>
              Evaluation Wizard
            </h1>
            <p className="text-sm text-muted-foreground">Guided expert evaluation against a project TOR &amp; matrix — extract, categorise, score, adjust, and save under the expert.</p>
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
          {error && <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}

          {/* ─── STEP 1: Expert & Context ──────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Select or add expert</h2>
                <p className="text-xs text-slate-500">Pick an existing expert (dedup) or type a new name.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Existing expert</span>
                  <select value={existingExpertId} onChange={(e) => pickExisting(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm">
                    <option value="">— New expert —</option>
                    {experts.map((e) => <option key={e.id} value={e.id}>{e.name}{e.status === "locked" ? " (booked)" : ""}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Expert name *</span>
                  <input value={expertName} onChange={(e) => setExpertName(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm" placeholder="Full name" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Email (for dedup)</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm" placeholder="email@example.com" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Nationality</span>
                  <input value={nationality} onChange={(e) => setNationality(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Current location</span>
                  <input value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm" placeholder="e.g. Berlin, Germany" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Level</span>
                  <input value={level} onChange={(e) => setLevel(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm" placeholder="e.g. Team Leader" />
                </label>
              </div>

              <div className="border-t pt-4">
                <h2 className="text-sm font-semibold text-slate-800">Project context</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Project</span>
                  <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm">
                    <option value="">— Select project —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Proposed position *</span>
                  <input value={proposedPosition} onChange={(e) => setProposedPosition(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm" placeholder="e.g. Senior TVET Expert" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">ToR excerpt</span>
                  <select value={torExcerptId} onChange={(e) => setTorExcerptId(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm">
                    <option value="">— None —</option>
                    {availableExcerpts.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Evaluation matrix</span>
                  <select value={matrixId} onChange={(e) => setMatrixId(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm">
                    <option value="">— None —</option>
                    {availableMatrices.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="flex justify-end">
                <button disabled={!canProceedStep0} onClick={() => setStep(1)}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Upload & Analyse ─────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">Upload CV &amp; run analysis</h2>
              <p className="text-xs text-slate-500">PDF, DOCX or image (scanned CVs use OCR). Full data is extracted and scored against the matrix.</p>

              {existingExpertId && (
                <div className="rounded-xl border bg-slate-50/60 p-4">
                  <p className="text-sm font-semibold text-slate-700">Use an existing CV already saved in the bank</p>
                  {loadingExistingCvs ? <p className="mt-2 text-xs text-slate-400">Loading stored CVs…</p> : existingCvs.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">No CVs stored yet for this expert. Upload a new CV below.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {existingCvs.map((cv) => (
                        <label key={cv.id} className={cn("flex cursor-pointer items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm", existingCvId === cv.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200")}> 
                          <span>
                            <span className="font-medium text-slate-700">{cv.fileName}</span>
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase text-slate-500">{cv.format}</span>
                          </span>
                          <input type="radio" name="existing-cv" checked={existingCvId === cv.id} onChange={() => setExistingCvId(cv.id)} className="h-4 w-4" />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <label className="block cursor-pointer rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-6 text-center hover:border-indigo-400">
                <p className="text-sm font-medium text-slate-700">{cvFile ? cvFile.name : "Or upload a fresh CV for this evaluation"}</p>
                <p className="mt-1 text-xs text-slate-400">PDF, DOCX, PNG, JPG</p>
                <input type="file" className="hidden" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCvFile(f); setExistingCvId(""); } }} />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} className="h-4 w-4" />
                Deep analysis <span className="text-xs text-slate-400">(thorough evidence search + infers criteria not explicitly stated)</span>
              </label>

              <div className="flex justify-between">
                <button onClick={() => setStep(0)} className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">← Back</button>
                <button disabled={(!cvFile && !existingCvId) || busy} onClick={runAnalysis}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
                  {busy ? "Analysing…" : deep ? "Run deep analysis" : "Run analysis"}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Adjust Report ────────────────────────────────── */}
          {step === 2 && result && (
            <div className="space-y-5">
              <div className="rounded-2xl border bg-gradient-to-br from-indigo-50/70 to-violet-50/50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Matrix score</p>
                    <p className="text-2xl font-bold text-indigo-700">{totals.pct}% <span className="text-sm font-medium text-slate-500">({totals.total}/{totals.max})</span></p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">TOR match {Math.round(result.tor_match_pct)}%</span>
                </div>
              </div>

              {/* Editable matrix */}
              <div className="rounded-2xl border bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Evaluation matrix (adjust scores &amp; evidence)</h3>
                <div className="space-y-2">
                  {matches.map((m, i) => (
                    <div key={i} className="rounded-xl border bg-slate-50/60 p-3">
                      <p className="text-xs font-medium text-slate-700">{m.requirement}</p>
                      <textarea value={m.evidence} onChange={(e) => updateMatch(i, { evidence: e.target.value })}
                        rows={2} className="mt-1 w-full rounded border bg-white p-2 text-[11px] italic text-slate-600" />
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Score</span>
                        <input type="number" min="0" max={m.max_score} step="0.25" value={m.score}
                          onChange={(e) => updateMatch(i, { score: Number(e.target.value) })}
                          className="w-16 rounded border bg-white px-2 py-1" />
                        <span className="text-slate-400">/ {m.max_score}</span>
                        <div className="ml-2 h-1.5 flex-1 rounded bg-slate-200">
                          <div className={cn("h-full rounded", m.score / m.max_score >= 0.75 ? "bg-emerald-500" : m.score / m.max_score >= 0.5 ? "bg-amber-400" : "bg-rose-400")}
                            style={{ width: `${m.max_score ? Math.min(100, (m.score / m.max_score) * 100) : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editable insights */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">Strengths</p>
                  <textarea value={strengths} onChange={(e) => { setStrengths(e.target.value); setAdjusted(true); }} rows={6} className="w-full rounded-lg border bg-white p-2 text-xs" />
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">Gaps vs TOR</p>
                  <textarea value={gaps} onChange={(e) => { setGaps(e.target.value); setAdjusted(true); }} rows={6} className="w-full rounded-lg border bg-white p-2 text-xs" />
                </div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">Short TOR analysis</p>
                <textarea value={torAnalysis} onChange={(e) => { setTorAnalysis(e.target.value); setAdjusted(true); }} rows={2} className="w-full rounded-lg border bg-white p-2 text-xs" />
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">← Back</button>
                <button disabled={busy} onClick={save}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
                  {busy ? "Saving…" : "Confirm & save evaluation"}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: Done ─────────────────────────────────────────── */}
          {step === 3 && (
            <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800">Evaluation saved</h2>
              <p className="mt-1 text-sm text-slate-500">The evaluation for <strong>{expertName}</strong> is stored under the expert in the Master Bank.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button onClick={() => router.push("/admin/expert-bank")} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90">Open Master Expert Bank</button>
                <button onClick={() => { setStep(0); setResult(null); setCvFile(null); setExistingExpertId(""); setExpertName(""); setEmail(""); setNationality(""); setCurrentLocation(""); setLevel(""); setProposedPosition(""); setMatches([]); setAdjusted(false); }}
                  className="rounded-xl border px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Evaluate another expert</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
