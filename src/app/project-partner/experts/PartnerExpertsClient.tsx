"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { BankExpert, BankCv, BankEvaluation } from "@/lib/expert-bank";
import { getPartnerExpertDetailAction, partnerBookExpertAction } from "./actions";
import CvViewerModal from "@/components/expert-bank/CvViewerModal";

interface Detail { cvs: BankCv[]; evaluations: BankEvaluation[] }

function scoreColor(pct: number) {
  return pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-rose-600";
}
function ringColor(pct: number) {
  return pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#f43f5e";
}

function ScoreRing({ pct, size = 72 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0" style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={7} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor(pct)} strokeWidth={7}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
        className="fill-slate-800 text-sm font-bold">{pct}%</text>
    </svg>
  );
}

export default function PartnerExpertsClient({ experts, partnerId, partnerName, isSccgAdmin }: {
  experts: BankExpert[]; partnerId: string; partnerName: string; isSccgAdmin: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BankExpert | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailErr, setDetailErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [viewCvId, setViewCvId] = useState<string | null>(null);
  const [viewCvName, setViewCvName] = useState("");

  const filtered = useMemo(() => experts.filter((e) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return e.expertName.toLowerCase().includes(q) || e.level.toLowerCase().includes(q) || e.position.toLowerCase().includes(q);
  }), [experts, query]);

  async function open(e: BankExpert) {
    setSelected(e); setDetail(null); setDetailErr(""); setLoading(true);
    try {
      const d = await getPartnerExpertDetailAction(e.id);
      if ("error" in d) setDetailErr(d.error);
      else setDetail(d);
    } finally { setLoading(false); }
  }

  function book(e: BankExpert) {
    const ev = detail?.evaluations[0];
    startTransition(async () => {
      await partnerBookExpertAction({ expertId: e.id, projectId: ev?.projectId, projectName: ev?.projectName });
      router.refresh();
      setSelected(null);
    });
  }

  const mineOrFree = (e: BankExpert) => e.status !== "locked" || e.lockedByPartnerId === partnerId;

  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-50/40" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="border-b bg-white px-6 py-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" /></svg>
          </span>
          Available Experts
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSccgAdmin ? "All experts across the network." : `Experts offered to ${partnerName || "your organisation"}. Book one to reserve them exclusively.`}
        </p>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search experts…"
          className="mt-3 w-64 rounded-lg border bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <p className="text-sm">No experts available to you yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((e) => {
              const booked = e.status === "locked" && e.lockedByPartnerId === partnerId;
              return (
                <button key={e.id} onClick={() => open(e)}
                  className="group rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10">
                  <div className="flex items-start justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow">
                      {e.expertName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    {booked && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">✓ Yours</span>}
                  </div>
                  <h3 className="mt-3 truncate text-sm font-semibold text-slate-800">{e.expertName}</h3>
                  <p className="truncate text-xs text-slate-500">{e.level || e.position || "Expert"}</p>
                  {e.nationality && <p className="text-[11px] text-slate-400">{e.nationality}</p>}
                </button>
              );
            })}
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
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-5 p-5">
              {loading && <p className="text-xs text-slate-400">Loading report…</p>}
              {detailErr && <p className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{detailErr}</p>}

              {detail && detail.evaluations[0] && (
                <div className="rounded-2xl border bg-gradient-to-br from-indigo-50/60 to-violet-50/40 p-4">
                  <div className="flex items-center gap-4">
                    <ScoreRing pct={detail.evaluations[0].percentage || detail.evaluations[0].torMatchPct} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">TOR Rating</p>
                      <p className={cn("text-2xl font-bold", scoreColor(detail.evaluations[0].percentage))}>{detail.evaluations[0].percentage}%</p>
                      <p className="text-[11px] text-slate-500">{detail.evaluations[0].totalScore}/{detail.evaluations[0].maxScore} points · {detail.evaluations[0].projectName || "General"}</p>
                    </div>
                  </div>
                  {detail.evaluations[0].torAnalysis && (
                    <p className="mt-3 rounded-lg bg-white/70 p-2 text-[11px] text-slate-600">{detail.evaluations[0].torAnalysis}</p>
                  )}
                </div>
              )}

              {/* Strengths & gaps */}
              {detail && detail.evaluations[0] && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">Strengths</p>
                    <p className="whitespace-pre-line text-[11px] text-slate-600">{detail.evaluations[0].strengths || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">Gaps vs TOR</p>
                    <p className="whitespace-pre-line text-[11px] text-slate-600">{detail.evaluations[0].gaps || "—"}</p>
                  </div>
                </div>
              )}

              {/* CVs — view / download */}
              {detail && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">CVs</p>
                  {detail.cvs.length === 0 && <p className="text-xs text-slate-400">No CVs available.</p>}
                  {detail.cvs.map((cv) => (
                    <div key={cv.id} className="flex items-center justify-between rounded-lg border bg-white p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-700">{cv.fileName}</p>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium uppercase text-indigo-700">{cv.format}</span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => { setViewCvId(cv.id); setViewCvName(cv.fileName); }}
                          className="rounded bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90">View CV</button>
                        <a href={`/api/expert-cv/${cv.id}?download=1`}
                          className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200">Download</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Book / reserve */}
              {mineOrFree(selected) && (
                <div className="pt-2">
                  {selected.status === "locked" && selected.lockedByPartnerId === partnerId ? (
                    <div className="rounded-xl bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700">✓ You have booked this expert</div>
                  ) : (
                    <button disabled={pending} onClick={() => book(selected)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {pending ? "Booking…" : "Book this expert (locks for others)"}
                    </button>
                  )}
                  <p className="mt-1.5 text-center text-[11px] text-slate-400">Once booked, this expert is reserved for you and hidden from other partners.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewCvId && <CvViewerModal cvId={viewCvId} fileName={viewCvName} onClose={() => setViewCvId(null)} />}
    </div>
  );
}
