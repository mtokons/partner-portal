import "server-only";
import type { Project, ProjectStaffingEntry, ProjectDocument, ProjectStatus, ExpertActiveStatus } from "@/types";

const PROJECTS_LIST = "Projects";
const STAFFING_LIST = "ProjectStaffing";

interface SpItem<T> {
  id: string;
  fields: T;
}

// ── Projects ─────────────────────────────────────────────────────────────
function mapProject(item: SpItem<Record<string, string>>): Project {
  const f = item.fields;
  return {
    id: item.id,
    name: f.Title || "",
    code: f.Code || "",
    client: f.Client || "",
    partnerName: f.PartnerName || "",
    partnerEmail: (f.PartnerEmail || "").toLowerCase(),
    orgId: f.OrgId || undefined,
    cvFormTemplateId: f.CvFormTemplateId || undefined,
    evaluationTemplateId: f.EvaluationTemplateId || undefined,
    description: f.Description || "",
    status: (f.Status as ProjectStatus) || "active",
    startDate: f.StartDate || undefined,
    endDate: f.EndDate || undefined,
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

export async function getProjects(): Promise<Project[]> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(PROJECTS_LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$top=500`
  );
  return (res?.value || []).map(mapProject);
}

export async function getProjectsForPartner(email: string): Promise<Project[]> {
  const all = await getProjects();
  const e = email.toLowerCase();
  return all.filter((p) => p.partnerEmail === e);
}

/** All projects owned by an org (for org admins + viewers scoped to that org). */
export async function getProjectsForOrg(orgId: string): Promise<Project[]> {
  const all = await getProjects();
  return all.filter((p) => {
    if (!p.orgId) return false;
    return p.orgId.split(",").map(x => x.trim()).includes(orgId);
  });
}

export function canAccessProject(project: Project | null, email: string, isAdmin: boolean, userOrgId?: string | null): boolean {
  if (!project) return false;
  if (isAdmin) return true;
  if (project.partnerEmail === email.toLowerCase()) return true;
  if (userOrgId && project.orgId) {
    const allowedOrgs = project.orgId.split(",").map((x) => x.trim());
    if (allowedOrgs.includes(userOrgId)) return true;
  }
  return false;
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(PROJECTS_LIST);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapProject(item) : null;
}

export async function createProject(data: Omit<Project, "id" | "createdAt">): Promise<Project> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(PROJECTS_LIST), {
    fields: {
      Title: data.name,
      Code: data.code,
      Client: data.client,
      PartnerName: data.partnerName,
      PartnerEmail: data.partnerEmail.toLowerCase(),
      OrgId: data.orgId || "",
      CvFormTemplateId: data.cvFormTemplateId || "",
      EvaluationTemplateId: data.evaluationTemplateId || "",
      Description: data.description || "",
      Status: data.status,
      StartDate: data.startDate || "",
      EndDate: data.endDate || "",
      CreatedAt: now,
    },
  });
  return { ...data, id: res.id, createdAt: now };
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(PROJECTS_LIST);
  const fields: Record<string, string> = { UpdatedAt: new Date().toISOString() };
  if (data.name !== undefined) fields.Title = data.name;
  if (data.code !== undefined) fields.Code = data.code;
  if (data.client !== undefined) fields.Client = data.client;
  if (data.partnerName !== undefined) fields.PartnerName = data.partnerName;
  if (data.partnerEmail !== undefined) fields.PartnerEmail = data.partnerEmail.toLowerCase();
  if (data.orgId !== undefined) fields.OrgId = data.orgId;
  if (data.cvFormTemplateId !== undefined) fields.CvFormTemplateId = data.cvFormTemplateId;
  if (data.evaluationTemplateId !== undefined) fields.EvaluationTemplateId = data.evaluationTemplateId;
  if (data.description !== undefined) fields.Description = data.description;
  if (data.status !== undefined) fields.Status = data.status;
  if (data.startDate !== undefined) fields.StartDate = data.startDate;
  if (data.endDate !== undefined) fields.EndDate = data.endDate;
  await graphPatch(`${base}/${id}/fields`, fields);
}

export async function deleteProject(id: string): Promise<void> {
  const { deleteListItemById, deleteListItemsByField } = await import("@/lib/sharepoint");
  await deleteListItemsByField(STAFFING_LIST, "ProjectId", id);
  await deleteListItemById(PROJECTS_LIST, id);
}

// ── Staffing matrix ──────────────────────────────────────────────────────
function mapStaffing(item: SpItem<Record<string, string>>): ProjectStaffingEntry {
  const f = item.fields;
  return {
    id: item.id,
    projectId: f.ProjectId || "",
    workPackage: f.WorkPackage || "",
    focusObjective: f.FocusObjective || "",
    position: f.Position || "",
    expertName: f.Title || "",
    expertId: f.ExpertId || undefined,
    education: f.Education || "",
    profExperience: f.ProfExperience || "",
    specificExperience: f.SpecificExperience || "",
    devCooperation: f.DevCooperation || "",
    expertise: f.Expertise || "",
    cvFileName: f.CvFileName || undefined,
    activeStatus: (f.ActiveStatus as ExpertActiveStatus) || "active",
    notes: f.Notes || "",
    order: Number(f.SortOrder || 0),
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

export async function getStaffingForProject(projectId: string): Promise<ProjectStaffingEntry[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(STAFFING_LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ProjectId eq '${escapeOData(projectId)}'&$top=500`
  );
  return (res?.value || []).map(mapStaffing).sort((a, b) => a.order - b.order);
}

/** Every staffing row across all projects — used to migrate/sync experts into the Master Expert Bank. */
export async function getAllStaffing(): Promise<ProjectStaffingEntry[]> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(STAFFING_LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$top=2000`
  );
  return (res?.value || []).map(mapStaffing);
}

/** Staffing rows linked to a given Master Expert Bank expert (by ExpertId). */
export async function getStaffingByExpertId(expertId: string): Promise<ProjectStaffingEntry[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(STAFFING_LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ExpertId eq '${escapeOData(expertId)}'&$top=500`
  );
  return (res?.value || []).map(mapStaffing);
}

export async function createStaffing(data: Omit<ProjectStaffingEntry, "id" | "createdAt">): Promise<ProjectStaffingEntry> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(STAFFING_LIST), {
    fields: {
      Title: data.expertName,
      ProjectId: data.projectId,
      WorkPackage: data.workPackage || "",
      FocusObjective: data.focusObjective || "",
      Position: data.position,
      ExpertId: data.expertId || "",
      Education: data.education || "",
      ProfExperience: data.profExperience || "",
      SpecificExperience: data.specificExperience || "",
      DevCooperation: data.devCooperation || "",
      Expertise: data.expertise || "",
      CvFileName: data.cvFileName || "",
      ActiveStatus: data.activeStatus,
      Notes: data.notes || "",
      SortOrder: String(data.order ?? 0),
      CreatedAt: now,
    },
  });
  return { ...data, id: res.id, createdAt: now };
}

export async function updateStaffing(id: string, data: Partial<ProjectStaffingEntry>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(STAFFING_LIST);
  const fields: Record<string, string> = { UpdatedAt: new Date().toISOString() };
  if (data.expertName !== undefined) fields.Title = data.expertName;
  if (data.workPackage !== undefined) fields.WorkPackage = data.workPackage;
  if (data.focusObjective !== undefined) fields.FocusObjective = data.focusObjective;
  if (data.position !== undefined) fields.Position = data.position;
  if (data.expertId !== undefined) fields.ExpertId = data.expertId;
  if (data.education !== undefined) fields.Education = data.education;
  if (data.profExperience !== undefined) fields.ProfExperience = data.profExperience;
  if (data.specificExperience !== undefined) fields.SpecificExperience = data.specificExperience;
  if (data.devCooperation !== undefined) fields.DevCooperation = data.devCooperation;
  if (data.expertise !== undefined) fields.Expertise = data.expertise;
  if (data.cvFileName !== undefined) fields.CvFileName = data.cvFileName;
  if (data.activeStatus !== undefined) fields.ActiveStatus = data.activeStatus;
  if (data.notes !== undefined) fields.Notes = data.notes;
  if (data.order !== undefined) fields.SortOrder = String(data.order);
  await graphPatch(`${base}/${id}/fields`, fields);
}

export async function deleteStaffing(id: string): Promise<void> {
  const { deleteListItemById } = await import("@/lib/sharepoint");
  await deleteListItemById(STAFFING_LIST, id);
}

// ── Documents (CVs / Proposals / Documents) ────────────────────────────────
export function projectFolder(projectId: string, sub: string): string {
  return `ProjectPartner/${projectId}/${sub}`;
}

export function getDriveDocPath(projectId: string, sub: string, fileName: string): string {
  return `ProjectPartner/${projectId}/${sub}/${fileName}`;
}

export async function listProjectDocuments(projectId: string, sub: string): Promise<ProjectDocument[]> {
  const { listDriveChildren } = await import("@/lib/graph");
  const items = await listDriveChildren(projectFolder(projectId, sub));
  return items.map((it) => ({
    id: it.id,
    name: it.name,
    folder: sub,
    sizeBytes: it.size || 0,
    modified: it.lastModifiedDateTime || "",
    isFolder: !!it.folder,
  }));
}
