"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { BankExpert, BankCv, BankEvaluation, ExpertStatus } from "@/lib/expert-bank";
import {
  getExpertDetailAction, releaseExpertAction, bookExpertForPartnerAction, offerExpertAction,
  importExpertsFromProjectsAction, setExpertInactiveAction, deleteExpertAction,
  onboardExpertAction,
} from "./actions";
import CvViewerModal from "@/components/expert-bank/CvViewerModal";

interface ExpertBankClientProps {
  experts: BankExpert[];
  partners: Partner[];
  suitabilityByExpertId?: Record<string, boolean>;
}

interface Partner { id: string; name: string }

const STATUS_META: Record<ExpertStatus, { label: string; cls: string; dot: string }> = {
  available: { label: "Available", cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  offered:   { label: "Offered",   cls: "bg-blue-100 text-blue-700",       dot: "bg-blue-500" },
  booked:    { label: "Booked",    cls: "bg-amber-100 text-amber-700",     dot: "bg-amber-500" },
  locked:    { label: "Locked",    cls: "bg-rose-100 text-rose-700",       dot: "bg-rose-500" },
  inactive:  { label: "Inactive",  cls: "bg-slate-200 text-slate-700",      dot: "bg-slate-500" },
};

function StatusBadge({ status }: { status: ExpertStatus }) {
  const m = STATUS_META[status] || STATUS_META.available;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", m.cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", accent)}>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

export default function ExpertBankClient({ experts, partners, suitabilityByExpertId = {} }: ExpertBankClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ExpertStatus>("all");
  const [suitabilityFilter, setSuitabilityFilter] = useState<"all" | "suitable" | "unsuitable">("all");
  const [selected, setSelected] = useState<BankExpert | null>(null);
  const [detail, setDetail] = useState<{ cvs: BankCv[]; evaluations: BankEvaluation[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pending, startTransition] = useTransition();
  // CV viewer
  const [viewCv, setViewCv] = useState<{ previewUrl: string; downloadUrl: string; fileName: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  // Onboard modal state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    expertName: "",
    email: "",
    nationality: "",
    currentLocation: "",
    level: "Key Expert 2",
    tags: "",
  });
  const [onboardFile, setOnboardFile] = useState<File | null>(null);
  const [onboardBusy, setOnboardBusy] = useState(false);
  const [onboardError, setOnboardError] = useState("");

  const kpis = useMemo(() => ({
    total: experts.length,
    available: experts.filter((e) => e.status === "available").length,
    offered: experts.filter((e) => e.status === "offered").length,
    locked: experts.filter((e) => e.status === "locked" || e.status === "booked").length,
    inactive: experts.filter((e) => e.status === "inactive").length,
  }), [experts]);

  const filtered = useMemo(() => experts.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    const suitable = suitabilityByExpertId[e.id] === true;
    if (suitabilityFilter === "suitable" && !suitable) return false;
    if (suitabilityFilter === "unsuitable" && suitable) return false;
    if (query) {
      const q = query.toLowerCase();
      return e.expertName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
        || e.level.toLowerCase().includes(q) || e.position.toLowerCase().includes(q);
    }
    return true;
  }), [experts, statusFilter, suitabilityFilter, query, suitabilityByExpertId]);

  async function openExpert(e: BankExpert) {
    setSelected(e); setDetail(null); setLoadingDetail(true);
    try {
      const d = await getExpertDetailAction(e.id);
      setDetail(d);
    } finally { setLoadingDetail(false); }
  }

  function release(id: string) {
    startTransition(async () => { await releaseExpertAction(id); router.refresh(); setSelected(null); });
  }
  function book(id: string, partnerId: string, partnerName: string) {
    startTransition(async () => { await bookExpertForPartnerAction({ expertId: id, partnerId, partnerName }); router.refresh(); setSelected(null); });
  }
  function offer(id: string, partnerId: string) {
    startTransition(async () => { await offerExpertAction({ expertId: id, partnerId }); router.refresh(); });
  }
  function toggleInactive(id: string, inactive: boolean) {
    startTransition(async () => { await setExpertInactiveAction(id, inactive); router.refresh(); setSelected(null); });
  }
  async function removeExpert(id: string) {
    const ok = window.confirm("Delete this expert from the bank and remove all linked project rows?");
    if (!ok) return;
    startTransition(async () => { await deleteExpertAction(id); router.refresh(); setSelected(null); });
  }

  async function runImport() {
    setImporting(true); setImportMsg("");
    try {
      const { summary } = await importExpertsFromProjectsAction();
      setImportMsg(`Imported ${summary.expertsCreated} new expert(s), linked ${summary.expertsLinked} project row(s) and ${summary.cvsLinked} CV(s) from ${summary.projectsScanned} project(s).`);
      router.refresh();
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-50/40" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="border-b bg-white px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H6a2 2 0 00-2 2z" /></svg>
              </span>
              Master Expert Bank
            </h1>
            <p className="text-sm text-muted-foreground">Central database for every expert — CVs, evaluations &amp; project history in one place. Open an expert to offer or assign them to a project partner.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowOnboardModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Onboard Expert
            </button>
            <div className="flex flex-col items-end gap-0.5">
              <button onClick={runImport} disabled={importing}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                {importing ? "Importing…" : "Import from projects"}
              </button>
              {importMsg && <p className="max-w-xs text-right text-[10px] text-slate-500">{importMsg}</p>}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total experts" value={kpis.total} accent="border-slate-200 bg-white" />
          <KpiCard label="Available" value={kpis.available} accent="border-emerald-100 bg-emerald-50/50" />
          <KpiCard label="Offered" value={kpis.offered} accent="border-blue-100 bg-blue-50/50" />
          <KpiCard label="Booked / locked" value={kpis.locked} accent="border-rose-100 bg-rose-50/50" />
          <KpiCard label="Inactive" value={kpis.inactive} accent="border-slate-200 bg-slate-100/80" />
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, level…"
            className="w-64 rounded-lg border bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
          <div className="flex gap-1">
            {(["all", "available", "offered", "booked", "locked", "inactive"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn("rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  statusFilter === s ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border hover:bg-slate-50")}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["all", "suitable", "unsuitable"] as const).map((s) => (
              <button key={s} onClick={() => setSuitabilityFilter(s)}
                className={cn("rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  suitabilityFilter === s ? "bg-violet-600 text-white" : "bg-white text-slate-600 border hover:bg-slate-50")}>
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expert grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <svg className="mb-3 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H6a2 2 0 00-2 2z" /></svg>
            <p className="text-sm">No experts yet. Save an expert from CV Tailor to build the bank.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((e) => (
              <button key={e.id} onClick={() => openExpert(e)}
                className="group rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow">
                    {e.expertName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <h3 className="mt-3 truncate text-sm font-semibold text-slate-800">{e.expertName}</h3>
                <p className="truncate text-xs text-slate-500">{e.level || e.position || "—"}</p>
                {e.email && <p className="truncate text-[11px] text-slate-400">{e.email}</p>}
                <div className="mt-3 flex items-center justify-between border-t pt-2 text-[11px] text-slate-500">
                  <span>
                    {e.status === "locked"
                      ? <span className="text-rose-600">🔒 {e.lockedByPartnerName || "Booked"}{e.assignedProjectName ? ` · ${e.assignedProjectName}` : ""}</span>
                      : e.offeredTo.length > 0
                        ? <span className="text-blue-600">Offered to {e.offeredTo.length} partner(s)</span>
                        : <span className="text-emerald-600">In the pool</span>}
                  </span>
                  <a href={`/admin/experts/${e.id}`} onClick={(ev) => ev.stopPropagation()}
                    className="text-indigo-600 hover:underline">Profile →</a>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-bold shadow">
                  {selected.expertName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{selected.expertName}</h2>
                  <p className="text-xs text-slate-500">{selected.level || selected.position}</p>
                  <div className="mt-1"><StatusBadge status={selected.status} /></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/admin/experts/${selected.id}`}
                  className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                  Full profile →
                </a>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {/* Assignment / lock info */}
              <div className="rounded-xl border bg-slate-50/60 p-4 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-slate-400">Email</span><br /><span className="text-slate-700">{selected.email || "—"}</span></div>
                  <div><span className="text-slate-400">Nationality</span><br /><span className="text-slate-700">{selected.nationality || "—"}</span></div>
                  <div><span className="text-slate-400">Locked by</span><br /><span className="text-slate-700">{selected.lockedByPartnerName || "—"}</span></div>
                  <div><span className="text-slate-400">Project</span><br /><span className="text-slate-700">{selected.assignedProjectName || "—"}</span></div>
                </div>
              </div>

              {/* Lock / offer controls */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Assign to project partner</p>
                {selected.status === "inactive" ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500">This expert is inactive. Reactivate them first to offer or book them again.</p>
                    <button disabled={pending} onClick={() => toggleInactive(selected.id, false)}
                      className="w-full rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40">
                      ✅ Reactivate expert
                    </button>
                  </div>
                ) : selected.status === "locked" ? (
                  <>
                    <p className="text-[11px] text-slate-500">Exclusively assigned to <span className="font-semibold text-slate-700">{selected.lockedByPartnerName || "a partner"}</span>. Release to make this expert available to everyone again.</p>
                    <button disabled={pending} onClick={() => release(selected.id)}
                      className="w-full rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-40">
                      🔓 Release expert back to the pool
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-slate-500"><span className="font-medium text-blue-700">Offer</span> shares the expert with a partner (still available to others). <span className="font-medium text-amber-700">Book</span> assigns them exclusively.</p>
                    <div className="flex flex-wrap gap-2">
                      {partners.map((p) => (
                        <div key={p.id} className="flex items-center gap-1 rounded-lg border bg-white p-1 text-xs">
                          <span className="px-1 text-slate-600">{p.name}</span>
                          <button disabled={pending} onClick={() => offer(selected.id, p.id)}
                            className="rounded bg-blue-50 px-2 py-1 font-medium text-blue-700 hover:bg-blue-100">Offer</button>
                          <button disabled={pending} onClick={() => book(selected.id, p.id, p.name)}
                            className="rounded bg-amber-50 px-2 py-1 font-medium text-amber-700 hover:bg-amber-100">Book</button>
                        </div>
                      ))}
                      {partners.length === 0 && <p className="text-xs text-slate-400">No project partners defined yet.</p>}
                    </div>
                    <button disabled={pending} onClick={() => toggleInactive(selected.id, true)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40">
                      ⏸ Deactivate expert
                    </button>
                    <button disabled={pending} onClick={() => removeExpert(selected.id)}
                      className="w-full rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-40">
                      🗑 Delete from bank everywhere
                    </button>
                  </>
                )}
              </div>

              {loadingDetail && <p className="text-xs text-slate-400">Loading CVs &amp; evaluations…</p>}

              {/* CVs */}
              {detail && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">CVs ({detail.cvs.length})</p>
                  {detail.cvs.length === 0 && <p className="text-xs text-slate-400">No CVs stored.</p>}
                  {detail.cvs.map((cv) => (
                    <div key={cv.id} className="flex items-center justify-between rounded-lg border bg-white p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-700">{cv.fileName}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 uppercase">{cv.format}</span>
                          {cv.tailored && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Tailored</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => setViewCv({ previewUrl: cv.previewUrl || "", downloadUrl: cv.downloadUrl || "", fileName: cv.fileName })}
                          className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200">View CV</button>
                        <a href={cv.downloadUrl || `/api/expert-cv/${cv.id}?download=1`}
                          className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200">Download</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Evaluations */}
              {detail && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Evaluations ({detail.evaluations.length})</p>
                  {detail.evaluations.length === 0 && <p className="text-xs text-slate-400">No evaluations stored.</p>}
                  {detail.evaluations.map((ev) => (
                    <div key={ev.id} className="rounded-xl border bg-white p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-700">{ev.projectName || "General"}</p>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          ev.percentage >= 80 ? "bg-emerald-100 text-emerald-700" : ev.percentage >= 60 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>
                          {ev.percentage}% · {ev.totalScore}/{ev.maxScore}
                        </span>
                      </div>
                      {ev.torAnalysis && <p className="mt-1 text-[11px] text-slate-500">{ev.torAnalysis}</p>}
                      {ev.strengths && <p className="mt-1 line-clamp-2 text-[11px] text-emerald-700 whitespace-pre-line">{ev.strengths}</p>}
                      {ev.gaps && <p className="mt-0.5 line-clamp-2 text-[11px] text-amber-700 whitespace-pre-line">{ev.gaps}</p>}
                      {ev.adjusted && <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">Human-adjusted</span>}
                      {ev.legacySource && <span className="mt-1 ml-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Project matrix</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewCv && (
        <CvViewerModal
          previewUrl={viewCv.previewUrl}
          downloadUrl={viewCv.downloadUrl}
          fileName={viewCv.fileName}
          onClose={() => setViewCv(null)}
        />
      )}

      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowOnboardModal(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800">Onboard New Expert</h3>
            <p className="text-xs text-slate-500 mb-4">Create a new expert profile in the Master database, upload their CV, and proceed to evaluation.</p>
            
            {onboardError && <p className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{onboardError}</p>}
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!onboardForm.expertName) {
                setOnboardError("Expert name is required");
                return;
              }
              setOnboardBusy(true);
              setOnboardError("");
              try {
                const fd = new FormData();
                fd.append("expertName", onboardForm.expertName);
                fd.append("email", onboardForm.email);
                fd.append("nationality", onboardForm.nationality);
                fd.append("currentLocation", onboardForm.currentLocation);
                fd.append("level", onboardForm.level);
                fd.append("tags", onboardForm.tags);
                if (onboardFile) {
                  fd.append("file", onboardFile);
                }
                const res = await onboardExpertAction(fd);
                if (res.ok) {
                  setShowOnboardModal(false);
                  setOnboardForm({ expertName: "", email: "", nationality: "", currentLocation: "", level: "Key Expert 2", tags: "" });
                  setOnboardFile(null);
                  router.push(`/admin/experts/${res.expertId}`);
                }
              } catch (err) {
                setOnboardError(err instanceof Error ? err.message : "Onboarding failed");
              } finally {
                setOnboardBusy(false);
              }
            }} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500">Full Name *</label>
                <input required className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={onboardForm.expertName} onChange={(e) => setOnboardForm(p => ({ ...p, expertName: e.target.value }))} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500">Email Address</label>
                  <input type="email" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={onboardForm.email} onChange={(e) => setOnboardForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500">Expert Level</label>
                  <select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={onboardForm.level} onChange={(e) => setOnboardForm(p => ({ ...p, level: e.target.value }))}>
                    <option value="Key Expert 2">Key Expert 2</option>
                    <option value="International Pool">International Pool</option>
                    <option value="National Pool">National Pool</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500">Nationality</label>
                  <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={onboardForm.nationality} onChange={(e) => setOnboardForm(p => ({ ...p, nationality: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500">Current Location</label>
                  <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={onboardForm.currentLocation} onChange={(e) => setOnboardForm(p => ({ ...p, currentLocation: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500">Tags (comma separated)</label>
                <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g. Energy, TVET, Procurement" value={onboardForm.tags} onChange={(e) => setOnboardForm(p => ({ ...p, tags: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500">Upload CV File</label>
                <input type="file" className="mt-1 w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" accept=".pdf,.docx,.txt" onChange={(e) => setOnboardFile(e.target.files?.[0] || null)} />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setShowOnboardModal(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={onboardBusy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                  {onboardBusy ? "Onboarding..." : "Onboard Expert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
