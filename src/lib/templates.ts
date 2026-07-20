import "server-only";
import type { CvFormField, CvFormTemplate, EvaluationCriterion, EvaluationTemplate } from "@/types";

const CV_FORMS_LIST = "CvFormTemplates";
const EVAL_TEMPLATES_LIST = "EvaluationTemplates";

interface SpItem<T> { id: string; fields: T }

// ── CV form templates ───────────────────────────────────────────────────────

function mapCvForm(item: SpItem<Record<string, string>>): CvFormTemplate {
  const f = item.fields;
  let fields: CvFormField[] = [];
  try { fields = JSON.parse(f.FieldsJson || "[]"); } catch { fields = []; }
  return {
    id: item.id,
    projectId: f.ProjectId || "",
    name: f.Title || "",
    fields,
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

export async function getCvFormTemplatesForProject(projectId: string): Promise<CvFormTemplate[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(CV_FORMS_LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ProjectId eq '${escapeOData(projectId)}'&$top=200`
  );
  return (res?.value || []).map(mapCvForm);
}

export async function getCvFormTemplateById(id: string): Promise<CvFormTemplate | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(CV_FORMS_LIST);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapCvForm(item) : null;
}

export async function createCvFormTemplate(data: Omit<CvFormTemplate, "id" | "createdAt">): Promise<CvFormTemplate> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(CV_FORMS_LIST), {
    fields: { Title: data.name, ProjectId: data.projectId, FieldsJson: JSON.stringify(data.fields), CreatedAt: now },
  });
  return { ...data, id: res.id, createdAt: now };
}

export async function updateCvFormTemplate(id: string, data: Partial<CvFormTemplate>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(CV_FORMS_LIST);
  const fields: Record<string, string> = { UpdatedAt: new Date().toISOString() };
  if (data.name !== undefined) fields.Title = data.name;
  if (data.fields !== undefined) fields.FieldsJson = JSON.stringify(data.fields);
  await graphPatch(`${base}/${id}/fields`, fields);
}

export async function deleteCvFormTemplate(id: string): Promise<void> {
  const { deleteListItemById } = await import("@/lib/sharepoint");
  await deleteListItemById(CV_FORMS_LIST, id);
}

// ── Evaluation templates (per project) ──────────────────────────────────────

function mapEvalTemplate(item: SpItem<Record<string, string>>): EvaluationTemplate {
  const f = item.fields;
  let criteria: EvaluationCriterion[] = [];
  try { criteria = JSON.parse(f.CriteriaJson || "[]"); } catch { criteria = []; }
  return {
    id: item.id,
    projectId: f.ProjectId || "",
    evalKey: f.EvalKey || "",
    name: f.Title || "",
    minPercent: Number(f.MinPercent) || 0,
    criteria,
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

export async function getEvaluationTemplatesForProject(projectId: string): Promise<EvaluationTemplate[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EVAL_TEMPLATES_LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ProjectId eq '${escapeOData(projectId)}'&$top=200`
  );
  return (res?.value || []).map(mapEvalTemplate);
}

export async function getEvaluationTemplateById(id: string): Promise<EvaluationTemplate | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EVAL_TEMPLATES_LIST);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapEvalTemplate(item) : null;
}

export function templateTotalPoints(t: EvaluationTemplate): number {
  return t.criteria.reduce((s, c) => s + c.maxPoints, 0);
}

export async function createEvaluationTemplate(data: Omit<EvaluationTemplate, "id" | "createdAt">): Promise<EvaluationTemplate> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(EVAL_TEMPLATES_LIST), {
    fields: {
      Title: data.name, ProjectId: data.projectId, EvalKey: data.evalKey,
      MinPercent: data.minPercent, CriteriaJson: JSON.stringify(data.criteria), CreatedAt: now,
    },
  });
  return { ...data, id: res.id, createdAt: now };
}

export async function updateEvaluationTemplate(id: string, data: Partial<EvaluationTemplate>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EVAL_TEMPLATES_LIST);
  const fields: Record<string, string | number> = { UpdatedAt: new Date().toISOString() };
  if (data.name !== undefined) fields.Title = data.name;
  if (data.evalKey !== undefined) fields.EvalKey = data.evalKey;
  if (data.minPercent !== undefined) fields.MinPercent = data.minPercent;
  if (data.criteria !== undefined) fields.CriteriaJson = JSON.stringify(data.criteria);
  await graphPatch(`${base}/${id}/fields`, fields);
}

export async function deleteEvaluationTemplate(id: string): Promise<void> {
  const { deleteListItemById } = await import("@/lib/sharepoint");
  await deleteListItemById(EVAL_TEMPLATES_LIST, id);
}
