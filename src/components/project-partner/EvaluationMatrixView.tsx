"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { EvaluationCriterion, ExpertEvaluation } from "@/types";

interface TemplateInfo { name: string; minPercent: number; criteria: EvaluationCriterion[] }

interface Props {
  projectId: string;
  evaluations: ExpertEvaluation[];
  templates: Record<string, TemplateInfo>;
}

const EMPTY_TEMPLATE: TemplateInfo = { name: "", minPercent: 0, criteria: [] };

// Aggregate per-criterion points into category percentages for an expert.
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

const TYPE_LABEL: Record<string, string> = { "expert-2": "Key Expert 2", "pool-1": "International Pool", "pool-2": "National Pool" };
const TYPE_COLOR: Record<string, string> = { "expert-2": "#7c3aed", "pool-1": "#0ea5e9", "pool-2": "#10b981" };
const FALLBACK_COLOR = "#2563eb";
const colorFor = (key: string) => TYPE_COLOR[key] || FALLBACK_COLOR;

export default function EvaluationMatrixView({ evaluations, templates }: Props) {
  const heatRef = useRef<SVGSVGElement | null>(null);
  const radarRef = useRef<SVGSVGElement | null>(null);
  const [selected, setSelected] = useState<ExpertEvaluation | null>(evaluations[0] || null);

  // Union of all category labels across templates, ordered.
  const categories = useMemo(() => {
    const order = ["Education/Training", "Language", "General Prof. Experience", "Specific Prof. Experience", "Leadership/Management", "International Experience", "Country Experience", "Region Experience", "Dev. Cooperation", "Other"];
    const present = new Set<string>();
    for (const ev of evaluations) for (const c of (templates[ev.evalType] || EMPTY_TEMPLATE).criteria) present.add(c.category);
    const ordered = order.filter((o) => present.has(o));
    // append any custom categories not covered by the canonical order
    const extras = [...present].filter((p) => !order.includes(p));
    return [...ordered, ...extras];
  }, [evaluations, templates]);

  // ── Heatmap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = d3.select(heatRef.current);
    svg.selectAll("*").remove();
    if (evaluations.length === 0) return;

    const margin = { top: 96, right: 24, bottom: 16, left: 220 };
    const cell = 40;
    const width = margin.left + categories.length * cell + margin.right;
    const height = margin.top + evaluations.length * cell + margin.bottom;
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").style("max-width", `${width}px`);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const color = d3.scaleSequential(d3.interpolateRdYlGn).domain([0.4, 1]);

    // column headers (rotated)
    g.selectAll(".colh").data(categories).enter().append("text")
      .attr("x", (_, i) => i * cell + cell / 2).attr("y", -8)
      .attr("transform", (_, i) => `rotate(-40, ${i * cell + cell / 2}, -8)`)
      .attr("text-anchor", "start").attr("font-size", 11).attr("font-family", "Inter, system-ui, sans-serif").attr("fill", "#475569").text((d) => d);

    const tooltip = d3.select("body").append("div")
      .attr("class", "eval-tip").style("position", "absolute").style("pointer-events", "none")
      .style("background", "#0f172a").style("color", "#fff").style("padding", "6px 9px")
      .style("border-radius", "6px").style("font-size", "11px").style("opacity", 0).style("z-index", "60").style("max-width", "260px");

    evaluations.forEach((ev, row) => {
      const cs = categoryScores(ev, templates[ev.evalType] || EMPTY_TEMPLATE);
      const map = new Map(cs.map((c) => [c.category, c]));

      // row label (clickable — selects the expert)
      g.append("text").attr("x", -10).attr("y", row * cell + cell / 2)
        .attr("text-anchor", "end").attr("dominant-baseline", "middle").attr("font-size", 12).attr("font-family", "Inter, system-ui, sans-serif")
        .attr("font-weight", selected?.id === ev.id ? 700 : 400)
        .attr("fill", selected?.id === ev.id ? "#1d4ed8" : "#0f172a")
        .style("cursor", "pointer")
        .on("click", () => setSelected(ev))
        .on("mouseover", function () { d3.select(this).attr("fill", "#1d4ed8").attr("text-decoration", "underline"); })
        .on("mouseout", function () { d3.select(this).attr("fill", selected?.id === ev.id ? "#1d4ed8" : "#0f172a").attr("text-decoration", "none"); })
        .text(`${ev.expertId} · ${ev.expertName.length > 20 ? ev.expertName.slice(0, 19) + "…" : ev.expertName}`);

      categories.forEach((cat, col) => {
        const c = map.get(cat);
        const cellG = g.append("g")
          .style("cursor", c ? "pointer" : "default")
          .on("mousemove", (e: MouseEvent) => {
            if (!c) return;
            tooltip.style("opacity", 1)
              .html(`<b>${ev.expertName}</b><br/>${cat}<br/>${c.got.toFixed(2)} / ${c.max} pts (${Math.round(c.pct * 100)}%)`)
              .style("left", `${e.pageX + 12}px`).style("top", `${e.pageY - 10}px`);
          })
          .on("mouseleave", () => tooltip.style("opacity", 0))
          .on("click", () => setSelected(ev));
        cellG.append("rect")
          .attr("x", col * cell + 2).attr("y", row * cell + 2).attr("width", cell - 4).attr("height", cell - 4)
          .attr("rx", 6).attr("fill", c ? color(c.pct) : "#f1f5f9")
          .attr("stroke", selected?.id === ev.id ? "#1e293b" : "transparent").attr("stroke-width", 2);
        if (c) cellG.append("text").attr("x", col * cell + cell / 2).attr("y", row * cell + cell / 2)
          .attr("text-anchor", "middle").attr("dominant-baseline", "middle").attr("font-size", 10).attr("font-weight", 600).attr("font-family", "Inter, system-ui, sans-serif")
          .style("pointer-events", "none")
          .attr("fill", c.pct > 0.75 ? "#064e3b" : "#7f1d1d").text(`${Math.round(c.pct * 100)}`);
      });
    });

    return () => { tooltip.remove(); };
  }, [evaluations, categories, templates, selected]);

  // ── Radar for the selected expert ─────────────────────────────────────────
  useEffect(() => {
    const svg = d3.select(radarRef.current);
    svg.selectAll("*").remove();
    if (!selected) return;
    const tpl = templates[selected.evalType] || EMPTY_TEMPLATE;
    const data = categoryScores(selected, tpl);
    if (data.length === 0) return;
    const size = 320, r = 110, cx = size / 2, cy = size / 2 + 6;
    svg.attr("viewBox", `0 0 ${size} ${size}`).attr("width", "100%").style("max-width", `${size}px`);
    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);
    const angle = (i: number) => (Math.PI * 2 * i) / data.length - Math.PI / 2;

    // rings
    [0.25, 0.5, 0.75, 1].forEach((ring) => {
      g.append("circle").attr("r", r * ring).attr("fill", "none").attr("stroke", "#e2e8f0");
    });
    // axes + labels
    data.forEach((d, i) => {
      const x = Math.cos(angle(i)) * r, y = Math.sin(angle(i)) * r;
      g.append("line").attr("x1", 0).attr("y1", 0).attr("x2", x).attr("y2", y).attr("stroke", "#e2e8f0");
      const lx = Math.cos(angle(i)) * (r + 16), ly = Math.sin(angle(i)) * (r + 16);
      g.append("text").attr("x", lx).attr("y", ly).attr("text-anchor", Math.abs(lx) < 8 ? "middle" : lx > 0 ? "start" : "end")
        .attr("dominant-baseline", "middle").attr("font-size", 9).attr("font-family", "Inter, system-ui, sans-serif").attr("fill", "#475569")
        .text(d.category.replace(" Prof. Experience", "").replace(" Experience", ""));
    });
    // polygon
    const line = d3.lineRadial<{ pct: number }>().angle((_, i) => angle(i) + Math.PI / 2).radius((d) => r * d.pct).curve(d3.curveLinearClosed);
    g.append("path").datum(data).attr("d", line as never)
      .attr("fill", colorFor(selected.evalType)).attr("fill-opacity", 0.25)
      .attr("stroke", colorFor(selected.evalType)).attr("stroke-width", 2);
    data.forEach((d, i) => {
      g.append("circle").attr("cx", Math.cos(angle(i)) * r * d.pct).attr("cy", Math.sin(angle(i)) * r * d.pct)
        .attr("r", 3).attr("fill", colorFor(selected.evalType));
    });
  }, [selected, templates]);

  if (evaluations.length === 0) {
    return <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No evaluations available for this project yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" style={{ fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <div className="lg:col-span-2">
        <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Score %</span>
          <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded" style={{ background: "#d73027" }} /> low</span>
          <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded" style={{ background: "#fee08b" }} /> mid</span>
          <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded" style={{ background: "#1a9850" }} /> high</span>
          <span className="ml-auto">Click a row to inspect an expert</span>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-card p-3">
          <svg ref={heatRef} role="img" aria-label="Expert evaluation heatmap" />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        {selected && (
          <>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">{selected.expertId}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: colorFor(selected.evalType) }}>{TYPE_LABEL[selected.evalType] || (templates[selected.evalType]?.name ?? selected.evalType)}</span>
            </div>
            <h3 className="text-lg font-semibold">{selected.expertName}</h3>
            <p className="mb-3 text-xs text-muted-foreground">{selected.position}</p>

            <div className="mb-3 flex items-center gap-4">
              <ScoreDonut percentage={selected.percentage} passed={selected.passed} color={colorFor(selected.evalType)} />
              <div className="text-sm">
                <p className="text-2xl font-bold">{selected.totalScore}<span className="text-base font-normal text-muted-foreground"> / {selected.maxScore}</span></p>
                <p className={selected.passed ? "text-emerald-600" : "text-red-600"}>{selected.passed ? "Meets" : "Below"} minimum ({selected.minPercent}%)</p>
              </div>
            </div>

            <svg ref={radarRef} role="img" aria-label="Expert criteria radar" />

            <div className="mt-3 space-y-1">
              {(templates[selected.evalType]?.criteria ?? []).map((c) => {
                const got = selected.scores.find((s) => s.key === c.key)?.score ?? 0;
                const pct = c.maxPoints ? got / c.maxPoints : 0;
                return (
                  <div key={c.key} className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="truncate pr-2 text-muted-foreground" title={c.label}>{c.category}</span>
                      <span className="shrink-0 font-medium">{got} / {c.maxPoints}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                      <div className="h-full rounded" style={{ width: `${pct * 100}%`, background: colorFor(selected.evalType) }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {selected.cvFileName && (
              <a href={`/api/project-files/${selected.projectId}/CVs/${encodeURIComponent(selected.cvFileName)}`} target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                View CV
              </a>
            )}
          </>
        )}
      </div>
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
