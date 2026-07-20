import "server-only";
import type { Deliverable } from "./contracts";

const LIST = "Deliverables";

interface SpItem<T> { id: string; fields: T }

function mapDeliverable(item: SpItem<Record<string, string>>): Deliverable {
  const f = item.fields;
  let editorNotes: string[] = [];
  let sourceRefs: string[] = [];
  try { editorNotes = JSON.parse(f.EditorNotesJson || "[]"); } catch { editorNotes = []; }
  try { sourceRefs = JSON.parse(f.SourceRefsJson || "[]"); } catch { sourceRefs = []; }
  return {
    id: item.id,
    projectId: f.ProjectId || "",
    section: f.Title || "",
    draftText: f.DraftText || "",
    editorNotes,
    sourceRefs,
    status: (f.Status as Deliverable["status"]) || "draft",
    provider: f.Provider || "",
    runId: f.RunId || "",
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

export async function createDeliverable(d: Omit<Deliverable, "id" | "createdAt">): Promise<Deliverable> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(LIST), {
    fields: {
      Title: d.section, ProjectId: d.projectId, DraftText: (d.draftText || "").slice(0, 60000),
      EditorNotesJson: JSON.stringify(d.editorNotes || []), SourceRefsJson: JSON.stringify(d.sourceRefs || []),
      Status: d.status, Provider: d.provider, RunId: d.runId, CreatedAt: now,
    },
  });
  return { ...d, id: res.id, createdAt: now };
}

export async function getDeliverablesForProject(projectId: string): Promise<Deliverable[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ProjectId eq '${escapeOData(projectId)}'&$top=200`
  );
  return (res?.value || []).map(mapDeliverable).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getDeliverableById(id: string): Promise<Deliverable | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapDeliverable(item) : null;
}

export async function updateDeliverable(id: string, patch: Partial<Deliverable>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(LIST);
  const fields: Record<string, string> = { UpdatedAt: new Date().toISOString() };
  if (patch.draftText !== undefined) fields.DraftText = patch.draftText.slice(0, 60000);
  if (patch.status !== undefined) fields.Status = patch.status;
  await graphPatch(`${base}/${id}/fields`, fields);
}

export async function deleteDeliverable(id: string): Promise<void> {
  const { deleteListItemById } = await import("@/lib/sharepoint");
  await deleteListItemById(LIST, id);
}
