import "server-only";

const LIST = "EvaluationMatrices";

export interface MatrixCriterion {
  label: string;
  maxPoints: number;
}

export interface EvaluationMatrix {
  id: string;
  projectId: string;
  projectName: string;
  role: string;
  fileName: string;
  criteria: MatrixCriterion[];
  maxTotal: number;
  rawText: string;
  provider: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

interface SpItem<T> { id: string; fields: T }

function mapMatrix(item: SpItem<Record<string, string>>): EvaluationMatrix {
  const f = item.fields;
  let criteria: MatrixCriterion[] = [];
  try {
    const parsed = f.CriteriaJson ? JSON.parse(f.CriteriaJson) : [];
    if (Array.isArray(parsed)) {
      criteria = parsed.map((c) => ({
        label: String(c.label ?? c.text ?? ""),
        maxPoints: Number(c.maxPoints ?? c.max_score ?? 0) || 0,
      }));
    }
  } catch { criteria = []; }
  return {
    id: item.id,
    projectId: f.ProjectId || "",
    projectName: f.ProjectName || "",
    role: f.Role || "",
    fileName: f.FileName || "",
    criteria,
    maxTotal: Number(f.MaxTotal || 0) || 0,
    rawText: f.RawText || "",
    provider: f.Provider || "",
    createdBy: f.CreatedBy || "",
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

export async function createEvaluationMatrix(
  d: Omit<EvaluationMatrix, "id" | "createdAt" | "updatedAt" | "maxTotal"> & { maxTotal?: number }
): Promise<EvaluationMatrix> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const maxTotal = d.maxTotal ?? d.criteria.reduce((s, c) => s + (c.maxPoints || 0), 0);
  const title = [d.projectName || d.fileName, d.role].filter(Boolean).join(" — ") || "Evaluation Matrix";
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(LIST), {
    fields: {
      Title: title.slice(0, 250),
      ProjectId: d.projectId,
      ProjectName: d.projectName,
      Role: d.role,
      FileName: d.fileName,
      CriteriaJson: JSON.stringify(d.criteria).slice(0, 30000),
      RawText: (d.rawText || "").slice(0, 60000),
      MaxTotal: maxTotal,
      Provider: d.provider,
      CreatedBy: d.createdBy,
      CreatedAt: now,
    },
  });
  return { ...d, id: res.id, maxTotal, createdAt: now };
}

export async function getEvaluationMatrices(): Promise<EvaluationMatrix[]> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$top=500`
  );
  return (res?.value || []).map(mapMatrix).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getEvaluationMatricesForProject(projectId: string): Promise<EvaluationMatrix[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ProjectId eq '${escapeOData(projectId)}'&$top=200`
  );
  return (res?.value || []).map(mapMatrix).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getEvaluationMatrixById(id: string): Promise<EvaluationMatrix | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapMatrix(item) : null;
}

export async function deleteEvaluationMatrix(id: string): Promise<void> {
  const { deleteListItemById } = await import("@/lib/sharepoint");
  await deleteListItemById(LIST, id);
}
