"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import * as d3 from "d3";
import type { EvaluationCriterion, ExpertEvaluation } from "@/types";
import { computeRoleFit, bestRoleFit, type RoleTemplate } from "@/lib/role-suitability";
import ProjectCvViewerModal from "./ProjectCvViewerModal";
import {
  getExpertBookingStateAction, bookExpertFromEvaluationAction,
  confirmBookingFromEvaluationAction, releaseBookingFromEvaluationAction,
  type ExpertBookingState,
} from "@/app/project-partner/evaluation/actions";

interface TemplateInfo { name: string; minPercent: number; criteria: EvaluationCriterion[] }

interface Props {
  projectId: string;
  projectName: string;
  evaluations: ExpertEvaluation[];
  templates: Record<string, TemplateInfo>;
  canBook: boolean;
  isAdmin?: boolean;
}

const EMPTY_TEMPLATE: TemplateInfo = { name: "", minPercent: 0, criteria: [] };
const TYPE_LABEL: Record<string, string> = { "expert-2": "Key Expert 2", "pool-1": "International Pool", "pool-2": "National Pool" };
const ROLE_COLOR: Record<string, string> = { "expert-2": "#7c3aed", "pool-1": "#0ea5e9", "pool-2": "#10b981" };
const colorFor = (key: string) => ROLE_COLOR[key] || "#2563eb";

function categoryScores(ev: ExpertEvaluation, tpl: TemplateInfo) {
  const cats = new Map<string, { got: number; max: number }>();
  for (const c of tpl.criteria) {
    const got = ev.scores.find((s) => s.key === c.key)?.score ?? 0;
    const cur = cats.get(c.category) || { got: 0, max: 0 };
    cur.got += got; cur.max += c.maxPoints;
    cats.set(c.category, cur);
  }
  return [...cats.entries()].map(([category, v]) => ({ category, pct: v.max ? v.got / v.max : 0, got: v.got, max: v.max }));
}

export default function ExpertEvaluationExplorer({ projectId, projectName, evaluations, templates, canBook, isAdmin = false }: Props) {
  const [selectedId, setSelectedId] = useState(evaluations[0]?.id || "");
  const [query, setQuery] = useState("");
  const [suitabilityFilter, setSuitabilityFilter] = useState<"all" | "suitable" | "unsuitable">("all");
  const [viewCv, setViewCv] = useState<string | null>(null);
  const [booking, setBooking] = useState<ExpertBookingState | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const radarRef = useRef<SVGSVGElement | null>(null);
  const roleRef = useRef<SVGSVGElement | null>(null);
  const distributionRef = useRef<SVGSVGElement | null>(null);

  const selected = useMemo(() => evaluations.find((e) => e.id === selectedId) || evaluations[0] || null, [evaluations, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return evaluations.filter((e) => {
      const matchesQuery = !q || e.expertName.toLowerCase().includes(q) || e.expertId.toLowerCase().includes(q) || (e.position || "").toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (suitabilityFilter === "suitable") return e.passed;
      if (suitabilityFilter === "unsuitable") return !e.passed;
      return true;
    });
  }, [evaluations, query, suitabilityFilter]);

  // Role-fit projection across every available role template.
  const roleFits = useMemo(() => {
    if (!selected) return [];
    const source = templates[selected.evalType] || EMPTY_TEMPLATE;
    const sourceRole: RoleTemplate = { key: selected.evalType, name: source.name || selected.evalType, minPercent: source.minPercent, criteria: source.criteria };
    const targets: RoleTemplate[] = Object.entries(templates).map(([key, t]) => ({ key, name: t.name || key, minPercent: t.minPercent, criteria: t.criteria }));
    return computeRoleFit(selected.scores, sourceRole, targets).sort((a, b) => b.percentage - a.percentage);
  }, [selected, templates]);

  const best = useMemo(() => bestRoleFit(roleFits), [roleFits]);

  // Load booking state when the expert changes.
  useEffect(() => {
    if (!selected) { setBooking(null); return; }
    let active = true;
    setBooking(null); setMsg("");
    getExpertBookingStateAction({ expertName: selected.expertName }).then((s) => { if (active) setBooking(s); }).catch(() => {});
    return () => { active = false; };
  }, [selected]);

  // ── Radar chart ────────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = d3.select(radarRef.current);
    svg.selectAll("*").remove();
    if (!selected) return;
    const tpl = templates[selected.evalType] || EMPTY_TEMPLATE;
    const data = categoryScores(selected, tpl);
    if (data.length === 0) return;
    const size = 360, r = 125, cx = size / 2, cy = size / 2 + 8;
    svg.attr("viewBox", `0 0 ${size} ${size}`).attr("width", "100%").style("max-width", `${size}px`);
    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);
    const angle = (i: number) => (Math.PI * 2 * i) / data.length - Math.PI / 2;
    const col = colorFor(selected.evalType);

    [0.25, 0.5, 0.75, 1].forEach((ring) => {
      g.append("circle").attr("r", r * ring).attr("fill", "none").attr("stroke", "#e2e8f0");
    });
    data.forEach((d, i) => {
      const x = Math.cos(angle(i)) * r, y = Math.sin(angle(i)) * r;
      g.append("line").attr("x1", 0).attr("y1", 0).attr("x2", x).attr("y2", y).attr("stroke", "#e2e8f0");
      const lx = Math.cos(angle(i)) * (r + 18), ly = Math.sin(angle(i)) * (r + 18);
      g.append("text").attr("x", lx).attr("y", ly).attr("text-anchor", Math.abs(lx) < 8 ? "middle" : lx > 0 ? "start" : "end")
        .attr("dominant-baseline", "middle").attr("font-size", 9.5).attr("font-family", "Inter, system-ui, sans-serif").attr("fill", "#475569")
        .text(d.category.replace(" Prof. Experience", "").replace(" Experience", ""));
    });
    const line = d3.lineRadial<{ pct: number }>().angle((_, i) => angle(i) + Math.PI / 2).radius((d) => r * d.pct).curve(d3.curveLinearClosed);
    g.append("path").datum(data).attr("d", line as never).attr("fill", col).attr("fill-opacity", 0.22).attr("stroke", col).attr("stroke-width", 2);
    data.forEach((d, i) => {
      g.append("circle").attr("cx", Math.cos(angle(i)) * r * d.pct).attr("cy", Math.sin(angle(i)) * r * d.pct).attr("r", 3.5).attr("fill", col);
    });
  }, [selected, templates]);

  // ── Candidate Distribution chart ───────────────────────────────────────────
  useEffect(() => {
    const svg = d3.select(distributionRef.current);
    svg.selectAll("*").remove();
    if (evaluations.length === 0) return;

    const margin = { top: 25, right: 30, bottom: 40, left: 30 };
    const width = 800;
    const height = 130;

    svg.attr("viewBox", `0 0 ${width} ${height}`)
       .attr("width", "100%")
       .style("max-width", `${width}px`)
       .style("overflow", "visible");

    // X scale (scores 0% to 100%)
    const x = d3.scaleLinear()
      .domain([0, 100])
      .range([margin.left, width - margin.right]);

    // Draw X Axis
    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d => `${d}%`))
      .attr("font-size", 10)
      .attr("font-family", "Inter, system-ui, sans-serif")
      .call(g => g.select(".domain").attr("stroke", "#cbd5e1"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#cbd5e1"));

    // Add min threshold lines (usually 80 or 85)
    const firstTpl = Object.values(templates)[0];
    const thresholdVal = firstTpl?.minPercent || 85;

    // Threshold vertical line
    svg.append("line")
      .attr("x1", x(thresholdVal))
      .attr("x2", x(thresholdVal))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 4");

    // Threshold text
    svg.append("text")
      .attr("x", x(thresholdVal))
      .attr("y", margin.top - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("font-weight", 700)
      .attr("fill", "#ef4444")
      .text(`Min Pass (${thresholdVal}%)`);

    // Prepare data with simple jitter on Y to avoid overlaps
    const centerY = (height - margin.bottom - margin.top) / 2 + margin.top;
    
    const data = [...evaluations].map((e, idx) => {
      const jitter = ((idx % 3) - 1) * 16;
      return {
        ...e,
        x: x(e.percentage),
        y: centerY + jitter
      };
    });

    // Create a simple overlay tooltip
    const tooltip = d3.select("body").append("div")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "#1e293b")
      .style("color", "#fff")
      .style("padding", "6px 10px")
      .style("border-radius", "6px")
      .style("font-size", "11px")
      .style("font-family", "Inter, sans-serif")
      .style("pointer-events", "none")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)")
      .style("z-index", "9999");

    // Draw candidate bubbles
    const nodes = svg.selectAll(".candidate-bubble")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "candidate-bubble")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedId(d.id);
        tooltip.style("visibility", "hidden");
      })
      .on("mouseover", (event, d) => {
        tooltip.style("visibility", "visible")
          .html(`<strong>${d.expertName}</strong><br/>Score: ${d.percentage}%<br/>Pool: ${TYPE_LABEL[d.evalType] || d.evalType}`);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", `${event.pageY - 42}px`).style("left", `${event.pageX + 12}px`);
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    // Outer glow/ring for selected candidate
    nodes.append("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.id === selectedId ? 19 : 0)
      .attr("fill", "none")
      .attr("stroke", d => colorFor(d.evalType))
      .attr("stroke-width", 2)
      .attr("opacity", 0.8);

    // Main bubble circle
    nodes.append("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 14)
      .attr("fill", d => colorFor(d.evalType))
      .attr("opacity", d => d.id === selectedId ? 1 : 0.85)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);

    // Initial letters inside bubbles
    nodes.append("text")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "#ffffff")
      .attr("font-size", "9px")
      .attr("font-weight", "700")
      .text(d => d.expertName.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase());

    return () => {
      tooltip.remove();
    };
  }, [evaluations, selectedId, templates]);

  // ── Radial Suitability Gauge (Best Fit Only) ──────────────────────────────────
  useEffect(() => {
    const svg = d3.select(roleRef.current);
    svg.selectAll("*").remove();
    if (!best) return;

    const w = 320;
    const h = 200;
    svg.attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").style("max-width", `${w}px`);

    const col = colorFor(best.roleKey);
    const minPct = templates[best.roleKey]?.minPercent || 85;

    const g = svg.append("g").attr("transform", `translate(${w / 2}, ${h - 30})`);

    const angleScale = d3.scaleLinear()
      .domain([0, 100])
      .range([-Math.PI / 2, Math.PI / 2]);

    // Gauge background arc
    const arcBackground = d3.arc()
      .innerRadius(80)
      .outerRadius(98)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    g.append("path")
      .attr("d", arcBackground as never)
      .attr("fill", "#e2e8f0");

    // Gauge value arc
    const arcValue = d3.arc()
      .innerRadius(80)
      .outerRadius(98)
      .startAngle(-Math.PI / 2)
      .endAngle(angleScale(best.percentage));

    g.append("path")
      .attr("d", arcValue as never)
      .attr("fill", col);

    // Target threshold marker line
    const thresholdAngle = angleScale(minPct);
    const x1 = Math.sin(thresholdAngle) * 76;
    const y1 = -Math.cos(thresholdAngle) * 76;
    const x2 = Math.sin(thresholdAngle) * 102;
    const y2 = -Math.cos(thresholdAngle) * 102;

    g.append("line")
      .attr("x1", x1).attr("y1", y1)
      .attr("x2", x2).attr("y2", y2)
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "2 1");

    g.append("text")
      .attr("x", x2 + (thresholdAngle > 0 ? 6 : -6))
      .attr("y", y2 - 4)
      .attr("text-anchor", thresholdAngle > 0 ? "start" : "end")
      .attr("font-size", 9)
      .attr("font-weight", 700)
      .attr("fill", "#ef4444")
      .text(`Min: ${minPct}%`);

    // Center Texts
    g.append("text")
      .attr("x", 0)
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .attr("font-size", "36")
      .attr("font-weight", "800")
      .attr("fill", "#0f172a")
      .text(`${Math.round(best.percentage)}%`);

    g.append("text")
      .attr("x", 0)
      .attr("y", 12)
      .attr("text-anchor", "middle")
      .attr("font-size", "11")
      .attr("font-weight", "700")
      .attr("fill", col)
      .text(TYPE_LABEL[best.roleKey] || best.roleName);

    g.append("text")
      .attr("x", 0)
      .attr("y", 26)
      .attr("text-anchor", "middle")
      .attr("font-size", "9.5")
      .attr("fill", best.meets ? "#10b981" : "#ef4444")
      .attr("font-weight", "600")
      .text(best.meets ? "Meets Minimum Threshold" : "Below Minimum Threshold");

  }, [best, templates]);

  function act(fn: () => Promise<{ ok: true } | { error: string }>, okMsg: string) {
    startTransition(async () => {
      setMsg("");
      const res = await fn();
      if ("error" in res) { setMsg(res.error); }
      else {
        setMsg(okMsg);
        if (selected) {
          const s = await getExpertBookingStateAction({ expertName: selected.expertName }).catch(() => null);
          if (s) setBooking(s);
        }
      }
    });
  }

  if (evaluations.length === 0) {
    return <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No evaluations available for this project yet.</p>;
  }

  const tpl = selected ? (templates[selected.evalType] || EMPTY_TEMPLATE) : EMPTY_TEMPLATE;

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Interactive Candidate distribution chart */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <h4 className="text-sm font-semibold mb-1">Candidate Score Distribution</h4>
        <p className="text-xs text-muted-foreground mb-3">Compare all candidates visually by their overall evaluation score. Click any candidate bubble to inspect their profile details below.</p>
        <div className="w-full overflow-x-auto">
          <svg ref={distributionRef} className="mx-auto" role="img" aria-label="Interactive candidate distribution chart" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
      {/* Expert selector */}
      <aside className="rounded-2xl border bg-card p-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search experts…"
          className="mb-2 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-blue-400" />
        <div className="mb-2 flex flex-wrap gap-1">
          {(["all", "suitable", "unsuitable"] as const).map((option) => (
            <button key={option} onClick={() => setSuitabilityFilter(option)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${suitabilityFilter === option ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {option === "all" ? "All pools" : option}
            </button>
          ))}
        </div>
        <div className="max-h-[560px] space-y-1 overflow-y-auto pr-1">
          {filtered.map((e) => {
            const active = selected?.id === e.id;
            return (
              <button key={e.id} onClick={() => setSelectedId(e.id)}
                className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left transition ${active ? "border-blue-500 bg-blue-50" : "border-transparent hover:bg-muted"}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold text-white" style={{ background: colorFor(e.evalType) }}>
                  {e.expertName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="block truncate text-sm font-medium text-foreground">{e.expertName}</span>
                    <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{e.expertId}</span>
                  </div>
                  <span className="block truncate text-[11px] text-muted-foreground">{e.percentage}% · {TYPE_LABEL[e.evalType] || e.evalType}</span>
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No matches.</p>}
        </div>
      </aside>

      {/* Detail */}
      {selected && (
        <section className="space-y-5">
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{selected.expertId}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: colorFor(selected.evalType) }}>
                    {TYPE_LABEL[selected.evalType] || tpl.name || selected.evalType}
                  </span>
                </div>
                <h3 className="mt-1 text-xl font-bold">{selected.expertName}</h3>
                <p className="text-sm text-muted-foreground">{selected.position || "—"}</p>
              </div>
              <div className="flex items-center gap-4">
                <ScoreDonut percentage={selected.percentage} passed={selected.passed} color={colorFor(selected.evalType)} />
                <div className="text-sm">
                  <p className="text-2xl font-bold">{selected.totalScore}<span className="text-base font-normal text-muted-foreground"> / {selected.maxScore}</span></p>
                  <p className={selected.passed ? "text-emerald-600" : "text-red-600"}>{selected.passed ? "Meets" : "Below"} minimum ({selected.minPercent}%)</p>
                </div>
              </div>
            </div>

            {best && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm">
                <span className="font-semibold text-emerald-800">Recommended role: {TYPE_LABEL[best.roleKey] || best.roleName}</span>
                <span className="text-emerald-700"> — {Math.round(best.percentage)}% fit{best.meets ? " (meets minimum)" : ""}. Based on CV evidence &amp; rating.</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border bg-card p-5">
              <h4 className="mb-1 text-sm font-semibold">Competency profile</h4>
              <p className="mb-2 text-xs text-muted-foreground">Category strengths from the evaluation matrix.</p>
              <svg ref={radarRef} role="img" aria-label="Expert competency radar" />
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <h4 className="mb-1 text-sm font-semibold">Recommended Role Suitability</h4>
              <p className="mb-2 text-xs text-muted-foreground">Gauge showing match percentage for the recommended role against minimum required threshold.</p>
              <div className="flex justify-center items-center h-[220px]">
                <svg ref={roleRef} role="img" aria-label="Role suitability gauge chart" />
              </div>
            </div>
          </div>

          {/* Per-criterion breakdown */}
          <div className="rounded-2xl border bg-card p-5">
            <h4 className="mb-3 text-sm font-semibold">Rating detail (scored against CV text)</h4>
            <div className="space-y-2.5">
              {tpl.criteria.map((c) => {
                const got = selected.scores.find((s) => s.key === c.key)?.score ?? 0;
                const pct = c.maxPoints ? got / c.maxPoints : 0;
                return (
                  <div key={c.key} className="text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground" title={c.label}><span className="font-medium text-foreground">{c.category}</span> — {c.label.length > 90 ? c.label.slice(0, 89) + "…" : c.label}</span>
                      <span className="shrink-0 font-semibold">{got} / {c.maxPoints}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-muted">
                      <div className="h-full rounded" style={{ width: `${pct * 100}%`, background: colorFor(selected.evalType) }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {selected.notes && <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground whitespace-pre-line">{selected.notes}</p>}
          </div>

          {/* Actions: CV preview + booking */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              {selected.cvFileName && (
                <button onClick={() => setViewCv(selected.cvFileName!)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  View CV
                </button>
              )}
              {selected.cvFileName && (
                <a href={`/api/project-files/${projectId}/CVs/${encodeURIComponent(selected.cvFileName)}?download=1`}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
                  Download CV
                </a>
              )}

              {canBook && booking && (
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {booking.booked ? (
                    <>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${booking.bookingType === "hard" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {booking.bookingType === "hard" ? "🔒 Hard-booked" : "⏳ Soft-booked"}{booking.byPartnerName && (isAdmin || booking.isMine) ? ` · ${booking.byPartnerName}` : ""}
                      </span>
                      {booking.isMine && booking.bookingType === "soft" && (
                        <button disabled={pending} onClick={() => act(() => confirmBookingFromEvaluationAction({ expertName: selected.expertName }), "Booking confirmed (hard).")}
                          className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40">Confirm (hard)</button>
                      )}
                      {(booking.isMine || !booking.booked) && (
                        <button disabled={pending} onClick={() => act(() => releaseBookingFromEvaluationAction({ expertName: selected.expertName }), "Booking released.")}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40">Release</button>
                      )}
                      {!booking.isMine && booking.bookingType === "soft" && booking.canBook && (
                        <button disabled={pending} onClick={() => act(() => bookExpertFromEvaluationAction({ expertName: selected.expertName, position: selected.position, projectId, projectName, bookingType: "hard" }), "Hard-booked for your organisation.")}
                          className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40">Hard-book</button>
                      )}
                    </>
                  ) : (
                    <>
                      <button disabled={pending} onClick={() => act(() => bookExpertFromEvaluationAction({ expertName: selected.expertName, position: selected.position, projectId, projectName, bookingType: "soft" }), "Soft-booked (still bookable by others).")}
                        className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-40">Soft-book</button>
                      <button disabled={pending} onClick={() => act(() => bookExpertFromEvaluationAction({ expertName: selected.expertName, position: selected.position, projectId, projectName, bookingType: "hard" }), "Hard-booked for your organisation.")}
                        className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40">Hard-book</button>
                    </>
                  )}
                </div>
              )}
            </div>
            {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
            {canBook && (
              <p className="mt-2 text-[11px] text-muted-foreground">Soft-booking reserves the expert but keeps them visible to others. Hard-booking confirms exclusive use — no other partner can then book them.</p>
            )}
          </div>
        </section>
      )}
      </div>

      {viewCv && selected && (
        <ProjectCvViewerModal projectId={projectId} fileName={viewCv} onClose={() => setViewCv(null)} />
      )}
    </div>
  );
}

function ScoreDonut({ percentage, passed, color }: { percentage: number; passed: boolean; color: string }) {
  const r = 26, c = 2 * Math.PI * r, off = c * (1 - percentage / 100);
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={passed ? color : "#ef4444"} strokeWidth="8"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 36 36)" />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="700" fill="#0f172a">{Math.round(percentage)}%</text>
    </svg>
  );
}
