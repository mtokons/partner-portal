import { describe, it, expect } from "vitest";
import { verifyEvidence } from "../../src/lib/agents/verify";
import {
  isThresholdCriterion, applyScoreGuardrails, computeNeedsReview, clampScore,
} from "../../src/lib/agents/guardrails";

describe("verifyEvidence (hallucination guard)", () => {
  const cv = "Delivered training of trainers programmes across Bangladesh. 15 years in TVET curriculum development. English C1, Bangla mother tongue.";

  it("accepts an exact (normalized) quote from the CV", () => {
    expect(verifyEvidence("training of trainers programmes", cv)).toBe(true);
  });

  it("accepts a close paraphrase with high content-word overlap", () => {
    expect(verifyEvidence("15 years TVET curriculum development", cv)).toBe(true);
  });

  it("rejects fabricated evidence not present in the CV", () => {
    expect(verifyEvidence("led a nuclear reactor safety audit in Germany", cv)).toBe(false);
  });

  it("rejects null or empty evidence", () => {
    expect(verifyEvidence(null, cv)).toBe(false);
    expect(verifyEvidence("", cv)).toBe(false);
    expect(verifyEvidence("   ", cv)).toBe(false);
  });
});

describe("isThresholdCriterion", () => {
  it("treats explicit must-have qualifications as binary", () => {
    expect(isThresholdCriterion({ label: "Must have a university degree", category: "Education/Training" })).toBe(true);
  });

  it("treats duration-based experience as proportional", () => {
    expect(isThresholdCriterion({ label: "10 years of professional experience", category: "General Prof. Experience" })).toBe(false);
  });

  it("does not mark a degree-with-experience wording as binary", () => {
    expect(isThresholdCriterion({ label: "University degree with 5 years experience", category: "Education" })).toBe(false);
  });
});

describe("applyScoreGuardrails", () => {
  it("clamps a score above the maximum", () => {
    expect(applyScoreGuardrails({ rawScore: 9, maxPoints: 4, evidenceVerified: true, threshold: false })).toBe(4);
  });

  it("forces 0 when evidence is unverified (no points on unsupported claims)", () => {
    expect(applyScoreGuardrails({ rawScore: 3, maxPoints: 4, evidenceVerified: false, threshold: false })).toBe(0);
  });

  it("passes a proportional score through when evidence is verified", () => {
    expect(applyScoreGuardrails({ rawScore: 2.5, maxPoints: 4, evidenceVerified: true, threshold: false })).toBe(2.5);
  });

  it("awards full points for a threshold criterion only when effectively maxed", () => {
    expect(applyScoreGuardrails({ rawScore: 1, maxPoints: 1, evidenceVerified: true, threshold: true })).toBe(1);
  });

  it("awards 0 for a partially-met threshold criterion", () => {
    expect(applyScoreGuardrails({ rawScore: 0.6, maxPoints: 1, evidenceVerified: true, threshold: true })).toBe(0);
  });

  it("never awards a negative score", () => {
    expect(applyScoreGuardrails({ rawScore: -5, maxPoints: 4, evidenceVerified: true, threshold: false })).toBe(0);
  });
});

describe("clampScore", () => {
  it("rounds to two decimals and clamps", () => {
    expect(clampScore(3.14159, 4)).toBe(3.14);
    expect(clampScore(10, 2)).toBe(2);
    expect(clampScore(NaN, 4)).toBe(0);
  });
});

describe("computeNeedsReview (confidence gate)", () => {
  it("clears a high-confidence, verified, successful score", () => {
    expect(computeNeedsReview({ ok: true, evidenceVerified: true, confidence: 0.9 })).toBe(false);
  });

  it("flags low confidence", () => {
    expect(computeNeedsReview({ ok: true, evidenceVerified: true, confidence: 0.5 })).toBe(true);
  });

  it("flags unverified evidence even at high confidence", () => {
    expect(computeNeedsReview({ ok: true, evidenceVerified: false, confidence: 0.95 })).toBe(true);
  });

  it("flags a failed/fallback run", () => {
    expect(computeNeedsReview({ ok: false, evidenceVerified: true, confidence: 0.95 })).toBe(true);
  });

  it("treats exactly the gate value as needing review (strictly below passes)", () => {
    expect(computeNeedsReview({ ok: true, evidenceVerified: true, confidence: 0.6 })).toBe(false);
    expect(computeNeedsReview({ ok: true, evidenceVerified: true, confidence: 0.59 })).toBe(true);
  });
});
