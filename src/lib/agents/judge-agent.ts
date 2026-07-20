import "server-only";
import type { EvaluationCriterion } from "@/types";
import { runAgent } from "./runtime";
import { verifyEvidence } from "./verify";
import { CriterionScoreSchema, type CriterionScore, type RawCriterionScore } from "./contracts";
import { isThresholdCriterion, applyScoreGuardrails, computeNeedsReview } from "./guardrails";
import { JUDGE_SYSTEM_PROMPT, JUDGE_PROMPT_VERSION, buildJudgeUserPrompt } from "./prompts/judge.v1";

export { isThresholdCriterion };

/** Deterministic mock used when no AI key is configured or the model fails. */
function mockJudge(c: EvaluationCriterion, excerpts: string): RawCriterionScore {
  const t = excerpts.toLowerCase();
  const words = c.label.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
  const hits = words.filter((w) => t.includes(w)).length;
  const frac = words.length ? Math.min(1, hits / Math.max(3, words.length)) : 0.5;
  const kw = words.find((w) => t.includes(w));
  const sentence = kw ? excerpts.split(/(?<=[.!?])\s/).find((s) => s.toLowerCase().includes(kw)) : null;
  return {
    score: Math.round(c.maxPoints * frac * 4) / 4,
    evidence: sentence ? sentence.trim().split(/\s+/).slice(0, 22).join(" ") : null,
    confidence: sentence ? 0.55 : 0.4, // mock is always uncertain → routes to human review
    reasoning: sentence ? "Keyword overlap between the criterion and the CV excerpt (mock estimate)." : "No matching text found in the excerpts (mock estimate).",
  };
}

/** Additional evaluation context that controls BD rule and sector accumulation. */
export interface JudgeContextRules {
  bangladeshProject?: boolean;
  /** Map from criterion key to its sector group info (if it belongs to one). */
  criterionSectorMode?: Record<string, { mode: "cumulative" | "individual"; peers: string[] }>;
}

/**
 * Score ONE criterion for ONE candidate (Persona 3). Runs the judge, verifies the
 * quoted evidence against the source, clamps the score, and flags low-confidence /
 * unverified results for human review.
 */
export async function scoreCriterion(params: {
  criterion: EvaluationCriterion;
  cvExcerpts: string;
  contextRef?: string;
  contextRules?: JudgeContextRules;
}): Promise<CriterionScore> {
  const { criterion, cvExcerpts } = params;
  const threshold = isThresholdCriterion(criterion);
  const rules = params.contextRules;
  const sectorInfo = rules?.criterionSectorMode?.[criterion.key];

  const { data, provider, runId, status } = await runAgent<RawCriterionScore>({
    persona: "judge",
    promptVersion: JUDGE_PROMPT_VERSION,
    system: JUDGE_SYSTEM_PROMPT,
    user: buildJudgeUserPrompt({
      criterionLabel: criterion.label,
      category: criterion.category,
      maxPoints: criterion.maxPoints,
      threshold,
      cvExcerpts,
      bangladeshProject: rules?.bangladeshProject,
      sectorMode: sectorInfo?.mode,
      peerSectors: sectorInfo?.peers,
    }),
    schema: CriterionScoreSchema,
    mock: () => mockJudge(criterion, cvExcerpts),
    contextRef: params.contextRef,
  });

  // Guardrails
  const evidenceVerified = verifyEvidence(data.evidence, cvExcerpts);
  const score = applyScoreGuardrails({
    rawScore: Number(data.score) || 0,
    maxPoints: criterion.maxPoints,
    evidenceVerified,
    threshold,
  });

  const confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0));
  const needsReview = computeNeedsReview({ ok: status === "ok", evidenceVerified, confidence });

  return {
    criterionKey: criterion.key,
    score,
    maxPoints: criterion.maxPoints,
    evidence: data.evidence,
    evidenceVerified,
    confidence,
    reasoning: data.reasoning || "",
    threshold,
    needsReview,
    provider,
    runId,
  };
}

/** Score every criterion of a matrix, one judge call each (kept sequential for cost control). */
export async function scoreAllCriteria(params: {
  criteria: EvaluationCriterion[];
  cvExcerpts: string;
  contextRefBase?: string;
  contextRules?: JudgeContextRules;
}): Promise<CriterionScore[]> {
  const out: CriterionScore[] = [];
  for (const criterion of params.criteria) {
    out.push(await scoreCriterion({
      criterion,
      cvExcerpts: params.cvExcerpts,
      contextRef: params.contextRefBase ? `${params.contextRefBase}/criterion:${criterion.key}` : undefined,
      contextRules: params.contextRules,
    }));
  }
  return out;
}
