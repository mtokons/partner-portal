import "server-only";
import type { CvFormField, EvaluationCriterion, ExpertCvIntake, CvIntakeStatus } from "@/types";

const INTAKE_LIST = "ExpertCvIntake";

interface SpItem<T> { id: string; fields: T }

function mapIntake(item: SpItem<Record<string, string>>): ExpertCvIntake {
  const f = item.fields;
  let form: Record<string, string> = {};
  try { form = JSON.parse(f.FormJson || "{}"); } catch { form = {}; }
  let profile: ExpertCvIntake["profile"];
  try { profile = f.ProfileJson ? JSON.parse(f.ProfileJson) : undefined; } catch { profile = undefined; }
  return {
    id: item.id,
    projectId: f.ProjectId || "",
    orgId: f.OrgId || undefined,
    expertName: f.Title || "",
    position: f.Position || "",
    cvFileName: f.CvFileName || undefined,
    rawText: f.RawText || "",
    form,
    profile,
    evalKey: f.EvalKey || undefined,
    status: (f.Status as CvIntakeStatus) || "draft",
    aiProvider: f.AiProvider || undefined,
    evaluationId: f.EvaluationId || undefined,
    notes: f.Notes || "",
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

export async function getIntakesForProject(projectId: string): Promise<ExpertCvIntake[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(INTAKE_LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ProjectId eq '${escapeOData(projectId)}'&$top=500`
  );
  return (res?.value || []).map(mapIntake).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getIntakeById(id: string): Promise<ExpertCvIntake | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(INTAKE_LIST);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapIntake(item) : null;
}

export async function createIntake(data: Omit<ExpertCvIntake, "id" | "createdAt">): Promise<ExpertCvIntake> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(INTAKE_LIST), {
    fields: {
      Title: data.expertName, ProjectId: data.projectId, OrgId: data.orgId || "", Position: data.position || "",
      CvFileName: data.cvFileName || "", RawText: (data.rawText || "").slice(0, 60000), FormJson: JSON.stringify(data.form || {}),
      ProfileJson: data.profile ? JSON.stringify(data.profile).slice(0, 60000) : "",
      EvalKey: data.evalKey || "", Status: data.status, AiProvider: data.aiProvider || "", EvaluationId: data.evaluationId || "",
      Notes: data.notes || "", CreatedAt: now,
    },
  });
  return { ...data, id: res.id, createdAt: now };
}

export async function updateIntake(id: string, data: Partial<ExpertCvIntake>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(INTAKE_LIST);
  const fields: Record<string, string> = { UpdatedAt: new Date().toISOString() };
  if (data.expertName !== undefined) fields.Title = data.expertName;
  if (data.position !== undefined) fields.Position = data.position;
  if (data.cvFileName !== undefined) fields.CvFileName = data.cvFileName;
  if (data.rawText !== undefined) fields.RawText = data.rawText.slice(0, 60000);
  if (data.form !== undefined) fields.FormJson = JSON.stringify(data.form);
  if (data.profile !== undefined) fields.ProfileJson = JSON.stringify(data.profile).slice(0, 60000);
  if (data.evalKey !== undefined) fields.EvalKey = data.evalKey;
  if (data.status !== undefined) fields.Status = data.status;
  if (data.aiProvider !== undefined) fields.AiProvider = data.aiProvider;
  if (data.evaluationId !== undefined) fields.EvaluationId = data.evaluationId;
  if (data.notes !== undefined) fields.Notes = data.notes;
  await graphPatch(`${base}/${id}/fields`, fields);
}

export async function deleteIntake(id: string): Promise<void> {
  const { deleteListItemById } = await import("@/lib/sharepoint");
  await deleteListItemById(INTAKE_LIST, id);
}

/** Run the AI extraction step over raw CV text and persist the structured form. */
export async function runExtraction(rawText: string, fields: CvFormField[]): Promise<{ form: Record<string, string>; provider: string }> {
  const { extractCvForm } = await import("@/lib/ai");
  const { form, provider } = await extractCvForm(rawText, fields);
  return { form, provider };
}

/** Run the AI scoring step against the project's evaluation criteria. */
export async function runScoring(profileText: string, criteria: EvaluationCriterion[]): Promise<{ scores: { key: string; score: number }[]; provider: string }> {
  const { scoreCv } = await import("@/lib/ai");
  const { scores, provider } = await scoreCv(profileText, criteria);
  return { scores, provider };
}
