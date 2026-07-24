import type { EvaluationCriterion } from "@/types";
import { REVIEW_CONFIDENCE_GATE } from "./contracts";

/**
 * Pure, deterministic scoring guardrails for the evaluation judge (Persona 3).
 * Kept free of `server-only`/network imports so they can be unit-tested directly —
 * these functions are the defensibility core of a live-bid score.
 */

export { REVIEW_CONFIDENCE_GATE };

/** Heuristic: is this criterion a binary "must have" threshold rather than proportional? */
export function isThresholdCriterion(c: Pick<EvaluationCriterion, "label" | "category">): boolean {
  const t = `${c.label} ${c.category}`.toLowerCase();
  return /must have|degree|university|mandatory|required|qualification|license|licence|citizen|native/.test(t)
    && !/years|experience|track record/.test(t);
}

/** Clamp to [0, maxPoints] and round to 2 decimals. */
export function clampScore(raw: number, maxPoints: number): number {
  return Math.max(0, Math.min(maxPoints, Math.round((Number(raw) || 0) * 100) / 100));
}

/**
 * Apply the conservative guardrails to a raw model score:
 * - clamp to [0, maxPoints]
 * - unverified evidence earns 0 (never award points on unsupported claims)
 * - threshold criteria are binary (full points only if effectively maxed, else 0)
 */
export function applyScoreGuardrails(params: {
  rawScore: number;
  maxPoints: number;
  evidenceVerified: boolean;
  threshold: boolean;
}): number {
  let score = clampScore(params.rawScore, params.maxPoints);
  if (!params.evidenceVerified && score > 0) score = 0;
  if (params.threshold) score = score >= params.maxPoints * 0.999 ? params.maxPoints : 0;
  return score;
}

/** A score must be reviewed by a human when the call failed, evidence is unverified, or confidence is low. */
export function computeNeedsReview(params: {
  ok: boolean;
  evidenceVerified: boolean;
  confidence: number;
  gate?: number;
}): boolean {
  const gate = params.gate ?? REVIEW_CONFIDENCE_GATE;
  return !params.ok || !params.evidenceVerified || params.confidence < gate;
}
