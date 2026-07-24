"use client";

import { Fragment, useState } from "react";
import { FileSpreadsheet, X } from "lucide-react";
import type { EvaluationCriterion, EvaluationType } from "@/types";
interface TemplateInfo { name: string; minPercent: number; criteria: EvaluationCriterion[] }

const ORDER: EvaluationType[] = ["expert-2", "pool-1", "pool-2"];
const SHEET_LABEL: Record<EvaluationType, string> = { "expert-2": "Expert 2", "pool-1": "Pool 1", "pool-2": "Pool 2" };

export default function ReferenceMatrixButton({ templates }: { templates: Record<EvaluationType, TemplateInfo> }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EvaluationType>("expert-2");

  const tpl = templates[tab];
  const total = tpl.criteria.reduce((s, c) => s + c.maxPoints, 0);
  const minScore = Math.round((total * tpl.minPercent) / 100 * 100) / 100;

  // group criteria by category preserving order
  const groups: { category: string; items: EvaluationCriterion[] }[] = [];
  for (const c of tpl.criteria) {
    const last = groups[groups.length - 1];
    if (last && last.category === c.category) last.items.push(c);
    else groups.push({ category: c.category, items: [c] });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
      >
        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
        Reference Matrix
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div>
                <h2 className="text-lg font-semibold">PRECISE – TVET4RE · Reference Evaluation Matrix</h2>
                <p className="text-xs text-muted-foreground">Official scoring criteria used to evaluate every expert CV.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-muted" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-1 border-b px-5 pt-3">
              {ORDER.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-t-md px-4 py-2 text-sm font-medium ${tab === t ? "border-b-2 border-blue-600 text-blue-600" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {SHEET_LABEL[t]} <span className="hidden sm:inline text-xs">· {templates[t].name}</span>
                </button>
              ))}
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/60 text-left">
                    <th className="border px-3 py-2 font-semibold">Criterion</th>
                    <th className="w-24 border px-3 py-2 text-right font-semibold">Max points</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <Fragment key={`cat-${g.category}`}>
                      <tr className="bg-emerald-50">
                        <td colSpan={2} className="border px-3 py-1.5 font-semibold text-emerald-900">{g.category}</td>
                      </tr>
                      {g.items.map((c) => (
                        <tr key={c.key} className="align-top">
                          <td className="border px-3 py-2 text-muted-foreground">{c.label}</td>
                          <td className="border px-3 py-2 text-right font-medium">{c.maxPoints}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  <tr className="bg-muted/40 font-semibold">
                    <td className="border px-3 py-2 text-right">Evaluation total score</td>
                    <td className="border px-3 py-2 text-right">{total}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="border px-3 py-2 text-right">Minimum to qualify ({tpl.minPercent}%)</td>
                    <td className="border px-3 py-2 text-right text-blue-600">{minScore}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
