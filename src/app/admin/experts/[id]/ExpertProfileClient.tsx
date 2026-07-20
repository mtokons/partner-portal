"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BankExpert, BankCv, BankEvaluation, ExpertStatus } from "@/lib/expert-bank";
import { updateExpertMetaAction, adjustEvaluationAction, setExpertStatusAction, deleteExpertCvAction, replaceExpertCvAction, setExpertInactiveAction, deleteExpertAction } from "./actions";
import CvViewerModal from "@/components/expert-bank/CvViewerModal";

interface Partner {
  id: string;
  name: string;
  orgId: string;
  orgName: string;
  role: string;
}

const STATUS_META: Record<ExpertStatus, { label: string; bg: string; dot: string }> = {
  available: { label: "Available",    bg: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  offered:   { label: "Offered",      bg: "bg-blue-100 text-blue-700",       dot: "bg-blue-500" },
  booked:    { label: "Booked",       bg: "bg-amber-100 text-amber-700",     dot: "bg-amber-500" },
  locked:    { label: "Locked",       bg: "bg-rose-100 text-rose-700",       dot: "bg-rose-500" },
  inactive:  { label: "Inactive",     bg: "bg-slate-200 text-slate-700",      dot: "bg-slate-500" },
};

function pct(score: number, max: number) { return max > 0 ? Math.round((score / max) * 100) : 0; }
function scoreColor(p: number) { return p >= 80 ? "text-emerald-600" : p >= 60 ? "text-amber-600" : "text-rose-600"; }
function ringColor(p: number) { return p >= 80 ? "#10b981" : p >= 60 ? "#f59e0b" : "#f43f5e"; }
const FIELD = "w-full rounded-lg border bg-white px-3 py-2 text-sm";

function ScoreRing({ pctVal, size = 72 }: { pctVal: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="shrink-0" style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor(pctVal)} strokeWidth={7}
        strokeDasharray={c} strokeDashoffset={c - (pctVal/100)*c} strokeLinecap="round" />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
        className="fill-slate-800 text-xs font-bold">{pctVal}%</text>
    </svg>
  );
}

export default function ExpertProfileClient({ expert, cvs, evaluations, partners }: {
  expert: BankExpert; cvs: BankCv[]; evaluations: BankEvaluation[]; partners: Partner[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Edit identity
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    expertName: expert.expertName, email: expert.email, nationality: expert.nationality,
    currentLocation: expert.currentLocation, level: expert.level, tags: expert.tags,
  });

  // Evaluation inline edit
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);
  const [evalPatch, setEvalPatch] = useState<{ strengths: string; gaps: string; torAnalysis: string; torMatchPct: number }>({ strengths: "", gaps: "", torAnalysis: "", torMatchPct: 0 });

  // CV viewer
  const [viewCv, setViewCv] = useState<{ previewUrl: string; downloadUrl: string; fileName: string } | null>(null);

  // Status controls
  const [selectedPartner, setSelectedPartner] = useState("");
  const [showStatus, setShowStatus] = useState(false);

  const [error, setError] = useState("");
  const [busyCvAction, setBusyCvAction] = useState<string | null>(null);
  const [replaceCvId, setReplaceCvId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const s = STATUS_META[expert.status] || STATUS_META.available;
  const initials = expert.expertName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  function saveIdentity() {
    startTransition(async () => {
      try {
        await updateExpertMetaAction(expert.id, form);
        setEditing(false); router.refresh();
      } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    });
  }

  function startEditEval(ev: BankEvaluation) {
    if (ev.legacySource) return;
    setEditingEvalId(ev.id);
    setEvalPatch({ strengths: ev.strengths || "", gaps: ev.gaps || "", torAnalysis: ev.torAnalysis || "", torMatchPct: ev.torMatchPct || 0 });
  }

  function saveEval(ev: BankEvaluation) {
    startTransition(async () => {
      try {
        await adjustEvaluationAction(ev.id, expert.id, evalPatch);
        setEditingEvalId(null); router.refresh();
      } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    });
  }

  async function deleteCv(cvId: string) {
    setBusyCvAction(cvId);
    try { await deleteExpertCvAction(expert.id, cvId); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
    finally { setBusyCvAction(null); }
  }

  async function replaceCv(currentCvId: string, file: File) {
    const fd = new FormData();
    fd.append("expertId", expert.id);
    fd.append("currentCvId", currentCvId);
    fd.append("file", file);
    setBusyCvAction(currentCvId);
    try { await replaceExpertCvAction(fd); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Replacement failed"); }
    finally { setBusyCvAction(null); }
  }

  function statusAction(action: "release" | "offer" | "soft-book" | "hard-book") {
    const partner = partners.find((p) => p.id === selectedPartner);
    startTransition(async () => {
      try {
        await setExpertStatusAction(expert.id, action, partner?.orgId || undefined, partner?.orgName || undefined);
        setShowStatus(false); router.refresh();
      } catch (e) { setError(e instanceof Error ? e.message : "Action failed"); }
    });
  }

  function toggleInactive(inactive: boolean) {
    startTransition(async () => {
      try {
        await setExpertInactiveAction(expert.id, inactive);
        router.refresh();
      } catch (e) { setError(e instanceof Error ? e.message : "Action failed"); }
    });
  }

  function deleteExpert() {
    const ok = window.confirm("Delete this expert from the bank and remove all linked project rows?");
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteExpertAction(expert.id);
        router.push("/admin/expert-bank");
      } catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
    });
  }

  const IDENTITY_FIELDS: [string, keyof typeof form][] = [
    ["Name", "expertName"], ["Email", "email"], ["Nationality", "nationality"],
    ["Current Location", "currentLocation"], ["Level", "level"], ["Tags", "tags"],
  ];

  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-50/40" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b bg-white px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/expert-bank" className="text-sm text-muted-foreground hover:text-foreground">← Expert Bank</Link>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl font-bold text-white shadow-lg shadow-indigo-500/30">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{expert.expertName}</h1>
              <p className="text-sm text-slate-500">{expert.level || expert.position || "Expert"}{expert.nationality ? ` · ${expert.nationality}` : ""}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", s.bg)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />{s.label}
                </span>
                {expert.lockedByPartnerName && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs text-rose-700">🔒 {expert.lockedByPartnerName}</span>}
                {expert.assignedProjectName && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">📁 {expert.assignedProjectName}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/evaluation-wizard?expertId=${expert.id}`}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
              📊 Evaluate
            </Link>
            <Link href={`/admin/cv-wizard?expertId=${expert.id}`}
              className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100">
              📄 Create CV
            </Link>
            <button disabled={pending} onClick={() => toggleInactive(expert.status !== "inactive")}
              className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              {expert.status === "inactive" ? "↩ Reactivate" : "⏸ Deactivate"}
            </button>
            <button disabled={pending} onClick={deleteExpert}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-40">
              🗑 Delete
            </button>
            <button onClick={() => setShowStatus(!showStatus)}
              className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              ⚙ Availability
            </button>
          </div>
        </div>

        {/* Availability panel */}
        {showStatus && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border bg-slate-50 p-3">
            <select value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)} className="rounded-lg border bg-white px-2 py-1.5 text-xs">
              <option value="">— Select partner user —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.orgName || "No Org"}) [{p.role === "project-partner-admin" ? "Admin" : "Viewer"}]
                </option>
              ))}
            </select>
            <button disabled={!selectedPartner || pending} onClick={() => statusAction("offer")}
              className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200 disabled:opacity-40">Offer</button>
            <button disabled={!selectedPartner || pending} onClick={() => statusAction("soft-book")}
              className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-200 disabled:opacity-40">Soft-book</button>
            <button disabled={!selectedPartner || pending} onClick={() => statusAction("hard-book")}
              className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-40">Hard-book</button>
            {expert.status !== "available" && (
              <button disabled={pending} onClick={() => statusAction("release")}
                className="rounded-lg bg-slate-100 border px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">Release</button>
            )}
          </div>
        )}

        {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-6 p-6 lg:grid-cols-3">
          {/* ── LEFT: Identity + CVs ────────────────────────────────── */}
          <div className="space-y-5 lg:col-span-1">
            {/* Identity card */}
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Profile</h2>
                <button onClick={() => setEditing(!editing)} className="text-xs font-medium text-indigo-600 hover:underline">{editing ? "Cancel" : "Edit"}</button>
              </div>
              {editing ? (
                <div className="mt-3 space-y-2">
                  {IDENTITY_FIELDS.map(([label, key]) => (
                    <label key={key} className="block space-y-0.5">
                      <span className="text-[10px] font-medium text-slate-400">{label}</span>
                      <input className={FIELD} value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
                    </label>
                  ))}
                  <button disabled={pending} onClick={saveIdentity}
                    className="w-full rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">Save</button>
                </div>
              ) : (
                <dl className="mt-3 space-y-2 text-sm">
                  {[["Email", expert.email],["Nationality", expert.nationality],["Location", expert.currentLocation],["Level", expert.level],["Tags", expert.tags]] .filter(([, v]) => v)
                    .map(([label, value]) => (
                    <div key={label as string} className="flex gap-2">
                      <dt className="w-24 shrink-0 text-[11px] text-slate-400">{label as string}</dt>
                      <dd className="text-slate-700 break-all">{value as string}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            {/* CVs card */}
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">CVs ({cvs.length})</h2>
                <Link href={`/admin/cv-wizard?expertId=${expert.id}`} className="text-xs font-medium text-violet-600 hover:underline">+ Create</Link>
              </div>
              {cvs.length === 0 ? (
                <p className="mt-3 text-xs text-slate-400">No CVs yet. Use the CV Creation Wizard.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {cvs.map((cv) => (
                    <li key={cv.id} className="rounded-xl border bg-slate-50/60 p-2.5">
                      <p className="truncate text-xs font-medium text-slate-700">{cv.fileName}</p>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
                        <div className="flex gap-1">
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium uppercase text-indigo-700">{cv.format}</span>
                          {cv.tailored && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Tailored</span>}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setViewCv({ previewUrl: cv.previewUrl || "", downloadUrl: cv.downloadUrl || "", fileName: cv.fileName })}
                            className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:opacity-90">View</button>
                          <a href={cv.downloadUrl || `/api/expert-cv/${cv.id}?download=1`}
                            className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-300">↓</a>
                          <button onClick={() => { setReplaceCvId(cv.id); fileInputRef.current?.click(); }} className="rounded bg-violet-200 px-2 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-300">Replace</button>
                          <button disabled={busyCvAction === cv.id} onClick={() => deleteCv(cv.id)} className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 hover:bg-rose-200 disabled:opacity-40">Delete</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={(e) => { const f = e.target.files?.[0]; if (f && replaceCvId) { void replaceCv(replaceCvId, f); } e.target.value = ""; setReplaceCvId(null); }} />
            </div>
          </div>

          {/* ── RIGHT: Evaluations ───────────────────────────────────── */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Evaluations ({evaluations.length})</h2>
              <Link href={`/admin/evaluation-wizard?expertId=${expert.id}`} className="text-xs font-medium text-indigo-600 hover:underline">+ Run evaluation</Link>
            </div>
            {evaluations.length === 0 && (
              <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-400">No evaluations yet. Run the Evaluation Wizard to score this expert against a TOR &amp; matrix.</div>
            )}
            {evaluations.map((ev) => {
              const p = ev.percentage || pct(ev.totalScore, ev.maxScore);
              const isEditing = editingEvalId === ev.id;
              return (
                <div key={ev.id} className="rounded-2xl border bg-white shadow-sm">
                  {/* Eval header */}
                  <div className="flex items-start gap-4 p-5">
                    <ScoreRing pctVal={p} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">{ev.proposedPosition || ev.projectName || "Evaluation"}</p>
                          <p className="text-xs text-slate-500">{ev.projectName && ev.proposedPosition ? ev.projectName : ""} · {ev.createdAt?.slice(0, 10) || ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-bold", scoreColor(p))}>{ev.totalScore}/{ev.maxScore} pts</span>
                          {ev.adjusted && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">Adjusted</span>}
                          {ev.legacySource && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Project matrix</span>}
                          {!ev.legacySource && (
                            <button onClick={() => isEditing ? setEditingEvalId(null) : startEditEval(ev)}
                              className="rounded-lg border px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                              {isEditing ? "Cancel" : "Edit"}
                            </button>
                          )}
                        </div>
                      </div>
                      {ev.torAnalysis && !isEditing && <p className="mt-1 text-[11px] text-slate-500">{ev.torAnalysis}</p>}
                    </div>
                  </div>

                  {/* Inline editor */}
                  {isEditing && (
                    <div className="border-t px-5 pb-5 pt-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Strengths</label>
                          <textarea rows={5} value={evalPatch.strengths} onChange={(e) => setEvalPatch((p) => ({ ...p, strengths: e.target.value }))}
                            className="mt-1 w-full rounded-lg border bg-white p-2 text-xs focus:border-emerald-400 focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Gaps vs TOR</label>
                          <textarea rows={5} value={evalPatch.gaps} onChange={(e) => setEvalPatch((p) => ({ ...p, gaps: e.target.value }))}
                            className="mt-1 w-full rounded-lg border bg-white p-2 text-xs focus:border-amber-400 focus:outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-blue-700">TOR Analysis</label>
                        <textarea rows={2} value={evalPatch.torAnalysis} onChange={(e) => setEvalPatch((p) => ({ ...p, torAnalysis: e.target.value }))}
                          className="mt-1 w-full rounded-lg border bg-white p-2 text-xs focus:border-blue-400 focus:outline-none" />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">TOR Match %</label>
                        <input type="number" min="0" max="100" value={evalPatch.torMatchPct} onChange={(e) => setEvalPatch((p) => ({ ...p, torMatchPct: Number(e.target.value) }))}
                          className="w-20 rounded-lg border bg-white px-2 py-1 text-sm" />
                      </div>
                      <button disabled={pending} onClick={() => saveEval(ev)}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">Save changes</button>
                    </div>
                  )}

                  {/* Strengths / Gaps summary */}
                  {!isEditing && (ev.strengths || ev.gaps) && (
                    <div className="grid gap-3 border-t px-5 pb-5 pt-4 sm:grid-cols-2">
                      {ev.strengths && (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">Strengths</p>
                          <p className="whitespace-pre-line text-[11px] text-slate-600">{ev.strengths}</p>
                        </div>
                      )}
                      {ev.gaps && (
                        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">Gaps vs TOR</p>
                          <p className="whitespace-pre-line text-[11px] text-slate-600">{ev.gaps}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Matrix matches */}
                  {!isEditing && (() => {
                    const mm: any[] = (ev.result as any)?.matrix_matches || [];
                    if (!mm.length) return null;
                    return (
                      <details className="border-t">
                        <summary className="cursor-pointer px-5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Matrix detail ({mm.length} criteria)
                        </summary>
                        <div className="space-y-1.5 px-5 pb-4">
                          {mm.map((m: any, i: number) => {
                            const cp = pct(m.score, m.max_score);
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="truncate text-[11px] text-slate-700">{m.requirement}</p>
                                  {m.evidence && <p className="text-[10px] italic text-slate-400">{m.evidence}</p>}
                                </div>
                                <span className="shrink-0 text-[11px] font-mono font-medium text-slate-600">{m.score}/{m.max_score}</span>
                                <div className="w-16 h-1.5 rounded bg-slate-200 shrink-0">
                                  <div className={cn("h-full rounded", cp >= 75 ? "bg-emerald-500" : cp >= 50 ? "bg-amber-400" : "bg-rose-400")}
                                    style={{ width: `${cp}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {viewCv && (
        <CvViewerModal
          previewUrl={viewCv.previewUrl}
          downloadUrl={viewCv.downloadUrl}
          fileName={viewCv.fileName}
          onClose={() => setViewCv(null)}
        />
      )}
    </div>
  );
}
