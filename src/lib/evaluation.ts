import "server-only";
import type { EvaluationCriterion, EvaluationType, ExpertEvaluation } from "@/types";

const EVAL_LIST = "ProjectEvaluations";

/** Official PRECISE – TVET4RE evaluation templates (from the GIZ Evaluation Matrix workbook). */
export const EVALUATION_TEMPLATES: Record<EvaluationType, { name: string; minPercent: number; criteria: EvaluationCriterion[] }> = {
  "expert-2": {
    name: "Key Expert 2",
    minPercent: 85,
    criteria: [
      { key: "education", category: "Education/Training", label: "University degree (master’s or equivalent) in vocational education, educational/social sciences, engineering, economics, or a sector-relevant field with strong focus on skills development", maxPoints: 1 },
      { key: "lang_en", category: "Language", label: "Knowledge of English, C1-level", maxPoints: 0.5 },
      { key: "lang_bn", category: "Language", label: "Bangla, C2-level", maxPoints: 0.5 },
      { key: "gen_exp", category: "General Prof. Experience", label: "10 years in the TVET sector developing/revising occupational or competency standards and curricula with organised private sector (last 15 years)", maxPoints: 4 },
      { key: "spec_exp", category: "Specific Prof. Experience", label: "5 years of professional experience in ToT development and implementation", maxPoints: 4 },
      { key: "leadership", category: "Leadership/Management", label: "2 years managing small expert teams, leading technical working groups or coordinating multi-stakeholder curriculum development", maxPoints: 2 },
      { key: "country_exp", category: "Country Experience", label: "15 years of professional experience in Bangladesh", maxPoints: 1 },
      { key: "dev_coop", category: "Dev. Cooperation", label: "10 years of experience in development cooperation projects", maxPoints: 2 },
      { key: "other", category: "Other", label: "Gender and inclusion in TVET (gender-responsive approaches, inclusive curricula, measures targeting women/disadvantaged groups)", maxPoints: 2 },
    ],
  },
  "pool-1": {
    name: "International Pool",
    minPercent: 85,
    criteria: [
      { key: "education", category: "Education/Training", label: "University degree or German Meister/technician qualification in a WP1-relevant occupational field", maxPoints: 1 },
      { key: "lang_en", category: "Language", label: "English, C1-level", maxPoints: 1 },
      { key: "gen_exp", category: "General Prof. Experience", label: "10 years in engineering with focus on sustainable energy, energy management, industrial & environmental safety", maxPoints: 3 },
      { key: "spec_exp", category: "Specific Prof. Experience", label: "10 years in TVET with focus on occupational/competency standards and curricula development", maxPoints: 4 },
      { key: "intl_exp", category: "International Experience", label: "10 years of professional experience outside Bangladesh", maxPoints: 1 },
      { key: "country_exp", category: "Region Experience", label: "5 years of professional experience in South Asia", maxPoints: 1 },
      { key: "dev_coop", category: "Dev. Cooperation", label: "5 years of experience in development cooperation projects", maxPoints: 1 },
      { key: "other", category: "Other", label: "10 years of proven experience in planning/implementing ToT and developing teaching & learning materials", maxPoints: 1 },
    ],
  },
  "pool-2": {
    name: "National Pool",
    minPercent: 85,
    criteria: [
      { key: "education", category: "Education/Training", label: "University degree (master’s or equivalent) in a WP1-relevant occupational field", maxPoints: 1 },
      { key: "lang_en", category: "Language", label: "Knowledge of English, C1-level", maxPoints: 0.5 },
      { key: "lang_bn", category: "Language", label: "Bangla, C2-level", maxPoints: 0.5 },
      { key: "gen_exp", category: "General Prof. Experience", label: "10 years in engineering with focus on sustainable energy, energy management, industrial & environmental safety", maxPoints: 3 },
      { key: "spec_exp", category: "Specific Prof. Experience", label: "10 years in TVET with focus on occupational/competency standards and curricula development", maxPoints: 4 },
      { key: "country_exp", category: "Country Experience", label: "5 years of professional experience in Bangladesh", maxPoints: 1 },
      { key: "dev_coop", category: "Dev. Cooperation", label: "5 years of experience in development cooperation projects", maxPoints: 2 },
      { key: "other", category: "Other", label: "10 years of experience in planning/implementing ToT and developing teaching & learning materials", maxPoints: 1 },
    ],
  },
};

export function templateMaxScore(type: EvaluationType): number {
  const tpl = EVALUATION_TEMPLATES[type];
  if (!tpl) return 0;
  return tpl.criteria.reduce((s, c) => s + c.maxPoints, 0);
}

interface SpItem<T> { id: string; fields: T }

function mapEvaluation(item: SpItem<Record<string, string>>): ExpertEvaluation {
  const f = item.fields;
  let scores: { key: string; score: number }[] = [];
  try { scores = JSON.parse(f.Scores || "[]"); } catch { scores = []; }
  const evalType = (f.EvalType as EvaluationType) || "pool-2";
  const maxScore = Number(f.MaxScore) || templateMaxScore(evalType);
  const totalScore = Number(f.TotalScore) || 0;
  return {
    id: item.id,
    projectId: f.ProjectId || "",
    expertId: f.ExpertId || "",
    expertName: f.Title || "",
    position: f.Position || "",
    evalType,
    scores,
    totalScore,
    maxScore,
    percentage: Number(f.Percentage) || (maxScore ? Math.round((totalScore / maxScore) * 1000) / 10 : 0),
    passed: f.Passed === "true" || f.Passed === "1",
    minPercent: Number(f.MinPercent) || EVALUATION_TEMPLATES[evalType]?.minPercent || 85,
    cvFileName: f.CvFileName || undefined,
    notes: f.Notes || "",
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

export async function getEvaluationsForProject(projectId: string): Promise<ExpertEvaluation[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EVAL_LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ProjectId eq '${escapeOData(projectId)}'&$top=500`
  );
  return (res?.value || [])
    .map(mapEvaluation)
    .sort((a, b) => a.expertId.localeCompare(b.expertId) || a.position.localeCompare(b.position));
}

/** Legacy/project-partner evaluations (ProjectEvaluations list) matched by expert name, so the
 *  Master Expert Bank can surface every evaluation on record for an expert, not just the ones
 *  created through the Evaluation Wizard. */
export async function getEvaluationsForExpertName(expertName: string): Promise<ExpertEvaluation[]> {
  const name = expertName.trim();
  if (!name) return [];
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EVAL_LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/Title eq '${escapeOData(name)}'&$top=200`
  );
  return (res?.value || []).map(mapEvaluation);
}

/** Persist new per-criterion scores for one evaluation and recompute totals. */
export async function updateEvaluationScores(id: string, evalType: EvaluationType, scores: { key: string; score: number }[]): Promise<ExpertEvaluation> {
  const { graphPatch, getSiteListUrlAsync, graphGetSafe } = await import("@/lib/graph");
  const tpl = EVALUATION_TEMPLATES[evalType];
  // clamp each score to its criterion max
  const clean = tpl.criteria.map((c) => {
    const raw = scores.find((s) => s.key === c.key)?.score ?? 0;
    return { key: c.key, score: Math.max(0, Math.min(c.maxPoints, Math.round(raw * 100) / 100)) };
  });
  const maxScore = templateMaxScore(evalType);
  const totalScore = Math.round(clean.reduce((s, x) => s + x.score, 0) * 100) / 100;
  const percentage = maxScore ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;
  const passed = percentage >= tpl.minPercent;
  const base = await getSiteListUrlAsync(EVAL_LIST);
  await graphPatch(`${base}/${id}/fields`, {
    Scores: JSON.stringify(clean), TotalScore: totalScore, MaxScore: maxScore,
    Percentage: percentage, Passed: String(passed), MinPercent: tpl.minPercent, UpdatedAt: new Date().toISOString(),
  });
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapEvaluation(item) : { id, projectId: "", expertId: "", expertName: "", position: "", evalType, scores: clean, totalScore, maxScore, percentage, passed, minPercent: tpl.minPercent, createdAt: "" };
}

/**
 * Create a new ProjectEvaluations record from a data-driven template (used by the
 * PPMS AI intake pipeline). Accepts an explicit criteria set + threshold so it works
 * for per-project evaluation templates with custom eval keys.
 */
export async function createEvaluationRecord(params: {
  projectId: string;
  expertId: string;
  expertName: string;
  position: string;
  evalKey: string;
  minPercent: number;
  criteria: EvaluationCriterion[];
  scores: { key: string; score: number }[];
  cvFileName?: string;
  notes?: string;
}): Promise<ExpertEvaluation> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const clean = params.criteria.map((c) => {
    const raw = params.scores.find((s) => s.key === c.key)?.score ?? 0;
    return { key: c.key, score: Math.max(0, Math.min(c.maxPoints, Math.round(raw * 100) / 100)) };
  });
  const maxScore = Math.round(params.criteria.reduce((s, c) => s + c.maxPoints, 0) * 100) / 100;
  const totalScore = Math.round(clean.reduce((s, x) => s + x.score, 0) * 100) / 100;
  const percentage = maxScore ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;
  const passed = percentage >= params.minPercent;
  const now = new Date().toISOString();
  const base = await getSiteListUrlAsync(EVAL_LIST);
  const res = await graphPost<{ id: string }>(base, {
    fields: {
      Title: params.expertName, ProjectId: params.projectId, ExpertId: params.expertId, Position: params.position,
      EvalType: params.evalKey, Scores: JSON.stringify(clean), TotalScore: totalScore, MaxScore: maxScore,
      Percentage: percentage, Passed: String(passed), MinPercent: params.minPercent,
      CvFileName: params.cvFileName || "", Notes: params.notes || "", CreatedAt: now,
    },
  });
  return {
    id: res.id, projectId: params.projectId, expertId: params.expertId, expertName: params.expertName,
    position: params.position, evalType: params.evalKey as EvaluationType, scores: clean, totalScore, maxScore,
    percentage, passed, minPercent: params.minPercent, cvFileName: params.cvFileName, notes: params.notes, createdAt: now,
  };
}

/**
 * Recompute + persist an existing evaluation's totals from an explicit criteria set
 * and score list (used after a human overrides an AI per-criterion score).
 */
export async function updateEvaluationFromScores(
  id: string,
  criteria: EvaluationCriterion[],
  minPercent: number,
  scores: { key: string; score: number }[],
): Promise<{ totalScore: number; maxScore: number; percentage: number; passed: boolean }> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const clean = criteria.map((c) => {
    const raw = scores.find((s) => s.key === c.key)?.score ?? 0;
    return { key: c.key, score: Math.max(0, Math.min(c.maxPoints, Math.round(raw * 100) / 100)) };
  });
  const maxScore = Math.round(criteria.reduce((s, c) => s + c.maxPoints, 0) * 100) / 100;
  const totalScore = Math.round(clean.reduce((s, x) => s + x.score, 0) * 100) / 100;
  const percentage = maxScore ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;
  const passed = percentage >= minPercent;
  const base = await getSiteListUrlAsync(EVAL_LIST);
  await graphPatch(`${base}/${id}/fields`, {
    Scores: JSON.stringify(clean), TotalScore: totalScore, MaxScore: maxScore,
    Percentage: percentage, Passed: String(passed), MinPercent: minPercent, UpdatedAt: new Date().toISOString(),
  });
  return { totalScore, maxScore, percentage, passed };
}

