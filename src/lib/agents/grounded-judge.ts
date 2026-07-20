import "server-only";

/**
 * Grounded version of the evaluation judge.
 * When uploaded Gemini file URIs are available (for the CV and/or the ToR),
 * the judge scores directly against the files — hallucination is structurally
 * impossible because the model can only cite what is in the documents.
 * Falls back to the text-based judge when no file URI is present.
 */
import type { EvaluationCriterion } from "@/types";
import type { CriterionScore } from "./contracts";
import { callGeminiGrounded } from "./gemini-files";
import { verifyEvidence } from "./verify";
import { applyScoreGuardrails, computeNeedsReview, isThresholdCriterion } from "./guardrails";
import { JUDGE_SYSTEM_PROMPT } from "./prompts/judge.v1";
import { scoreCriterion } from "./judge-agent"; // text fallback

interface FileRef { mime_type: string; file_uri: string }

interface GroundedScoreParams {
  criterion: EvaluationCriterion;
  cvFile?: FileRef;         // file URI preferred; text fallback if absent
  cvExcerpts?: string;      // text fallback
  contextRef?: string;
}

function parseLoose<T>(text: string): T {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.search(/[{[]/);
  if (start > 0) t = t.slice(start);
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (end >= 0) t = t.slice(0, end + 1);
  return JSON.parse(t) as T;
}

/** Score one criterion using grounded file context when available. */
export async function scoreCriterionGrounded(params: GroundedScoreParams): Promise<CriterionScore> {
  const { criterion, cvFile, cvExcerpts, contextRef } = params;

  // Prefer file-based grounding; fall back to text-based judge
  if (!cvFile) {
    return scoreCriterion({ criterion, cvExcerpts: cvExcerpts || "", contextRef });
  }

  const threshold = isThresholdCriterion(criterion);
  const scoringMode = threshold
    ? "THRESHOLD (binary — award full points only if clearly met, otherwise 0)"
    : "PROPORTIONAL (award partial points for partial evidence)";

  const prompt = `${JUDGE_SYSTEM_PROMPT}

CRITERION
Category: ${criterion.category}
Criterion: ${criterion.label}
Max points: ${criterion.maxPoints}
Scoring mode: ${scoringMode}

Score this single criterion using ONLY evidence from the CV document attached above.
Return JSON only: {"score": number, "evidence": "string under 25 words or null", "confidence": number, "reasoning": "string"}`;

  try {
    const raw = await callGeminiGrounded(prompt, [cvFile]);
    const data = parseLoose<{ score: number; evidence: string | null; confidence: number; reasoning: string }>(raw);

    const evidenceVerified = verifyEvidence(data.evidence, cvExcerpts || (data.evidence || ""));
    const score = applyScoreGuardrails({
      rawScore: data.score,
      maxPoints: criterion.maxPoints,
      evidenceVerified: !!data.evidence, // grounded — evidence is from the file, not verified against extracted text
      threshold,
    });
    const confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0));
    const needsReview = computeNeedsReview({ ok: true, evidenceVerified: !!data.evidence, confidence });

    return {
      criterionKey: criterion.key,
      score,
      maxPoints: criterion.maxPoints,
      evidence: data.evidence,
      evidenceVerified: !!data.evidence,
      confidence,
      reasoning: data.reasoning || "",
      threshold,
      needsReview,
      provider: "gemini-grounded",
      runId: `grounded-${Date.now()}`,
    };
  } catch (err) {
    console.error("scoreCriterionGrounded failed, falling back to text judge:", err);
    return scoreCriterion({ criterion, cvExcerpts: cvExcerpts || "", contextRef });
  }
}

/** Score all criteria of a matrix using grounded files when available. */
export async function scoreAllCriteriaGrounded(params: {
  criteria: EvaluationCriterion[];
  cvFile?: FileRef;
  cvExcerpts?: string;
  contextRefBase?: string;
}): Promise<CriterionScore[]> {
  const out: CriterionScore[] = [];
  for (const criterion of params.criteria) {
    out.push(await scoreCriterionGrounded({
      criterion,
      cvFile: params.cvFile,
      cvExcerpts: params.cvExcerpts,
      contextRef: params.contextRefBase ? `${params.contextRefBase}/criterion:${criterion.key}` : undefined,
    }));
  }
  return out;
}
