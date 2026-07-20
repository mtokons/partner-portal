"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { EvaluationScoreDetail } from "@/lib/agents/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, CheckCircle2, Quote, AlertTriangle } from "lucide-react";
import { resolveScoreDetailAction, publishReviewedEvaluationAction } from "../agent-actions";

export interface ReviewCandidate {
  evaluationId: string;
  intakeId: string;
  projectId: string;
  projectName: string;
  expertName: string;
  position: string;
  percentage: number;
  passed: boolean;
  details: EvaluationScoreDetail[];
}

function confidenceBadge(c: number) {
  if (c >= 0.8) return <Badge className="bg-emerald-100 text-emerald-800">High {Math.round(c * 100)}%</Badge>;
  if (c >= 0.6) return <Badge className="bg-amber-100 text-amber-800">Medium {Math.round(c * 100)}%</Badge>;
  return <Badge className="bg-red-100 text-red-800">Low {Math.round(c * 100)}%</Badge>;
}

export default function ReviewClient({ candidates }: { candidates: ReviewCandidate[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const totalFlagged = useMemo(
    () => candidates.reduce((s, c) => s + c.details.filter((d) => d.needsReview && !d.reviewed).length, 0),
    [candidates],
  );

  const visible = showAll ? candidates : candidates.filter((c) => c.details.some((d) => d.needsReview && !d.reviewed));

  function resolve(detail: EvaluationScoreDetail, approve: boolean) {
    setBusy(detail.id);
    const override = scores[detail.id];
    const score = override !== undefined && override !== "" ? Number(override) : undefined;
    startTransition(async () => {
      try {
        await resolveScoreDetailAction(detail.id, { score, approve });
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to save");
      } finally {
        setBusy(null);
      }
    });
  }

  function publish(c: ReviewCandidate) {
    if (!confirm(`Publish ${c.expertName}'s evaluation? Remaining flags will be marked reviewed.`)) return;
    setBusy(c.evaluationId);
    startTransition(async () => {
      try {
        await publishReviewedEvaluationAction(c.evaluationId, c.intakeId);
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to publish");
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          {totalFlagged > 0 ? <ShieldAlert className="h-5 w-5 text-amber-600" /> : <ShieldCheck className="h-5 w-5 text-emerald-600" />}
          <div>
            <p className="font-medium">{totalFlagged > 0 ? `${totalFlagged} criteria need your review` : "Nothing waiting for review"}</p>
            <p className="text-xs text-muted-foreground">{candidates.length} scored candidate{candidates.length === 1 ? "" : "s"} across your projects</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show only flagged" : "Show all candidates"}
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No candidates to review. Score a CV from the CV Intake page to populate this queue.
        </p>
      ) : (
        visible.map((c) => {
          const flagged = c.details.filter((d) => d.needsReview && !d.reviewed).length;
          return (
            <Card key={c.evaluationId}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{c.expertName}</CardTitle>
                  <p className="text-xs text-muted-foreground">{c.projectName}{c.position ? ` · ${c.position}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{c.percentage}%</Badge>
                  <Badge className={c.passed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>{c.passed ? "Meets min" : "Below min"}</Badge>
                  {flagged > 0
                    ? <Badge className="bg-amber-100 text-amber-800 gap-1"><AlertTriangle className="h-3 w-3" />{flagged} flagged</Badge>
                    : <Badge className="bg-emerald-100 text-emerald-800 gap-1"><CheckCircle2 className="h-3 w-3" />clear</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {c.details.map((d) => {
                  const isFlagged = d.needsReview && !d.reviewed;
                  return (
                    <div key={d.id} className={`rounded-lg border p-3 ${isFlagged ? "border-amber-300 bg-amber-50/40" : "bg-card"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{d.category}{d.threshold ? " · threshold" : ""}</p>
                          <p className="text-sm font-medium">{d.criterionLabel}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {confidenceBadge(d.confidence)}
                          {d.evidenceVerified
                            ? <Badge className="bg-emerald-100 text-emerald-800 gap-1"><ShieldCheck className="h-3 w-3" />evidence ok</Badge>
                            : <Badge className="bg-red-100 text-red-800 gap-1"><ShieldAlert className="h-3 w-3" />no evidence</Badge>}
                          {d.reviewed && <Badge className="bg-blue-100 text-blue-800">reviewed</Badge>}
                        </div>
                      </div>

                      <div className="mt-2 flex items-start gap-2 rounded bg-muted/50 p-2 text-sm">
                        <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="italic text-muted-foreground">{d.evidence ? `"${d.evidence}"` : "No supporting text found in the CV."}</span>
                      </div>
                      {d.reasoning && <p className="mt-1 text-xs text-muted-foreground">{d.reasoning}</p>}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">Score</span>
                        <Input
                          type="number" step="0.25" min={0} max={d.maxPoints}
                          defaultValue={d.score}
                          className="h-8 w-24"
                          onChange={(e) => setScores((s) => ({ ...s, [d.id]: e.target.value }))}
                        />
                        <span className="text-sm text-muted-foreground">/ {d.maxPoints}</span>
                        <span className="text-xs text-muted-foreground">(AI suggested {d.aiScore})</span>
                        <div className="ml-auto flex gap-2">
                          <Button size="sm" variant="outline" disabled={pending && busy === d.id} onClick={() => resolve(d, false)}>Save score</Button>
                          <Button size="sm" disabled={pending && busy === d.id} onClick={() => resolve(d, true)} className="gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end">
                  <Button onClick={() => publish(c)} disabled={pending && busy === c.evaluationId} className="gap-1">
                    <ShieldCheck className="h-4 w-4" /> Approve all &amp; publish
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
