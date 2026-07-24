import "server-only";
import type { EvaluationScoreDetail } from "./contracts";

const LIST = "EvaluationScoreDetails";

interface SpItem<T> { id: string; fields: T }

function mapDetail(item: SpItem<Record<string, string>>): EvaluationScoreDetail {
  const f = item.fields;
  return {
    id: item.id,
    evaluationId: f.EvaluationId || "",
    intakeId: f.IntakeId || "",
    projectId: f.ProjectId || "",
    criterionKey: f.Title || "",
    criterionLabel: f.CriterionLabel || "",
    category: f.Category || "",
    aiScore: Number(f.AiScore) || 0,
    score: Number(f.Score) || 0,
    maxPoints: Number(f.MaxPoints) || 0,
    evidence: f.Evidence || null,
    evidenceVerified: f.EvidenceVerified === "true" || f.EvidenceVerified === "1",
    confidence: Number(f.Confidence) || 0,
    reasoning: f.Reasoning || "",
    threshold: f.Threshold === "true" || f.Threshold === "1",
    needsReview: f.NeedsReview === "true" || f.NeedsReview === "1",
    reviewed: f.Reviewed === "true" || f.Reviewed === "1",
    reviewedBy: f.ReviewedBy || undefined,
    provider: f.Provider || "",
    runId: f.RunId || "",
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

export async function createScoreDetail(d: Omit<EvaluationScoreDetail, "id" | "createdAt">): Promise<string> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(LIST), {
    fields: {
      Title: d.criterionKey, EvaluationId: d.evaluationId, IntakeId: d.intakeId, ProjectId: d.projectId,
      CriterionLabel: d.criterionLabel, Category: d.category, AiScore: d.aiScore, Score: d.score, MaxPoints: d.maxPoints,
      Evidence: d.evidence || "", EvidenceVerified: String(d.evidenceVerified), Confidence: d.confidence,
      Reasoning: (d.reasoning || "").slice(0, 4000), Threshold: String(d.threshold), NeedsReview: String(d.needsReview),
      Reviewed: String(d.reviewed), ReviewedBy: d.reviewedBy || "", Provider: d.provider, RunId: d.runId, CreatedAt: now,
    },
  });
  return res.id;
}

export async function getScoreDetailsForEvaluation(evaluationId: string): Promise<EvaluationScoreDetail[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/EvaluationId eq '${escapeOData(evaluationId)}'&$top=500`
  );
  return (res?.value || []).map(mapDetail);
}

export async function getScoreDetailsForProject(projectId: string): Promise<EvaluationScoreDetail[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ProjectId eq '${escapeOData(projectId)}'&$top=500`
  );
  return (res?.value || []).map(mapDetail).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getScoreDetailById(id: string): Promise<EvaluationScoreDetail | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapDetail(item) : null;
}

export async function updateScoreDetail(id: string, patch: Partial<EvaluationScoreDetail>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const fields: Record<string, string | number> = { UpdatedAt: new Date().toISOString() };
  if (patch.score !== undefined) fields.Score = patch.score;
  if (patch.needsReview !== undefined) fields.NeedsReview = String(patch.needsReview);
  if (patch.reviewed !== undefined) fields.Reviewed = String(patch.reviewed);
  if (patch.reviewedBy !== undefined) fields.ReviewedBy = patch.reviewedBy;
  await graphPatch(`${base}/${id}/fields`, fields);
}

export async function deleteScoreDetailsForEvaluation(evaluationId: string): Promise<void> {
  const { deleteListItemsByField } = await import("@/lib/sharepoint");
  await deleteListItemsByField(LIST, "EvaluationId", evaluationId);
}
