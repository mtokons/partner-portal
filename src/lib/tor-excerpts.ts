import "server-only";

const LIST = "TorExcerpts";

export interface TorExcerptStructure {
  position?: string;
  summary?: string;
  required_qualifications?: string[];
  key_tasks?: string[];
  excerpt_text?: string;
  /** Whether this project runs in Bangladesh (non-BD experience = international) */
  bangladeshProject?: boolean;
  /** Sector groupings for cumulative / individual sector scoring */
  sectorGroups?: Array<{ groupLabel: string; sectors: string[]; mode: "cumulative" | "individual" }>;
}

export interface TorExcerpt {
  id: string;
  projectId: string;
  projectName: string;
  role: string;
  position: string;
  fileName: string;
  summary: string;
  excerptText: string;
  structure: TorExcerptStructure | null;
  rawText: string;
  provider: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

interface SpItem<T> { id: string; fields: T }

function mapExcerpt(item: SpItem<Record<string, string>>): TorExcerpt {
  const f = item.fields;
  let structure: TorExcerptStructure | null = null;
  try { structure = f.ExcerptJson ? JSON.parse(f.ExcerptJson) : null; } catch { structure = null; }
  return {
    id: item.id,
    projectId: f.ProjectId || "",
    projectName: f.ProjectName || "",
    role: f.Role || "",
    position: f.Position || "",
    fileName: f.FileName || "",
    summary: f.Summary || "",
    excerptText: f.ExcerptText || "",
    structure,
    rawText: f.RawText || "",
    provider: f.Provider || "",
    createdBy: f.CreatedBy || "",
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

export async function createTorExcerpt(
  d: Omit<TorExcerpt, "id" | "createdAt" | "updatedAt">
): Promise<TorExcerpt> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const title = [d.projectName || d.fileName, d.role].filter(Boolean).join(" — ") || "ToR Excerpt";
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(LIST), {
    fields: {
      Title: title.slice(0, 250),
      ProjectId: d.projectId,
      ProjectName: d.projectName,
      Role: d.role,
      Position: d.position,
      FileName: d.fileName,
      Summary: (d.summary || "").slice(0, 8000),
      ExcerptText: (d.excerptText || "").slice(0, 30000),
      ExcerptJson: d.structure ? JSON.stringify(d.structure).slice(0, 30000) : "",
      RawText: (d.rawText || "").slice(0, 60000),
      Provider: d.provider,
      CreatedBy: d.createdBy,
      CreatedAt: now,
    },
  });
  return { ...d, id: res.id, createdAt: now };
}

export async function getTorExcerpts(): Promise<TorExcerpt[]> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$top=500`
  );
  return (res?.value || []).map(mapExcerpt).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getTorExcerptsForProject(projectId: string): Promise<TorExcerpt[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ProjectId eq '${escapeOData(projectId)}'&$top=200`
  );
  return (res?.value || []).map(mapExcerpt).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getTorExcerptById(id: string): Promise<TorExcerpt | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapExcerpt(item) : null;
}

export async function deleteTorExcerpt(id: string): Promise<void> {
  const { deleteListItemById } = await import("@/lib/sharepoint");
  await deleteListItemById(LIST, id);
}
