import "server-only";
import type { TorDocument, TorStructure } from "./contracts";

const LIST = "TorDocuments";

interface SpItem<T> { id: string; fields: T }

function mapTor(item: SpItem<Record<string, string>>): TorDocument {
  const f = item.fields;
  let structure: TorStructure | null = null;
  try { structure = f.StructureJson ? JSON.parse(f.StructureJson) : null; } catch { structure = null; }
  return {
    id: item.id,
    projectId: f.ProjectId || "",
    fileName: f.FileName || "",
    rawText: f.RawText || "",
    structure,
    status: (f.Status as TorDocument["status"]) || "draft",
    provider: f.Provider || "",
    runId: f.RunId || "",
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

export async function createTorDoc(d: Omit<TorDocument, "id" | "createdAt">): Promise<TorDocument> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(LIST), {
    fields: {
      Title: d.structure?.projectTitle || d.fileName || "ToR", ProjectId: d.projectId, FileName: d.fileName,
      RawText: (d.rawText || "").slice(0, 60000), StructureJson: d.structure ? JSON.stringify(d.structure).slice(0, 60000) : "",
      Status: d.status, Provider: d.provider, RunId: d.runId, CreatedAt: now,
    },
  });
  return { ...d, id: res.id, createdAt: now };
}

export async function getTorDocsForProject(projectId: string): Promise<TorDocument[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ProjectId eq '${escapeOData(projectId)}'&$top=100`
  );
  return (res?.value || []).map(mapTor).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getTorDocById(id: string): Promise<TorDocument | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapTor(item) : null;
}

export async function updateTorDoc(id: string, patch: Partial<TorDocument>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const fields: Record<string, string> = { UpdatedAt: new Date().toISOString() };
  if (patch.structure !== undefined) fields.StructureJson = patch.structure ? JSON.stringify(patch.structure).slice(0, 60000) : "";
  if (patch.status !== undefined) fields.Status = patch.status;
  await graphPatch(`${base}/${id}/fields`, fields);
}

export async function deleteTorDoc(id: string): Promise<void> {
  const { deleteListItemById } = await import("@/lib/sharepoint");
  await deleteListItemById(LIST, id);
}
