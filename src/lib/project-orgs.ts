import "server-only";
import type { ProjectOrg } from "@/types";

const ORGS_LIST = "ProjectOrgs";

interface SpItem<T> { id: string; fields: T }

function mapOrg(item: SpItem<Record<string, string>>): ProjectOrg {
  const f = item.fields;
  return {
    id: item.id,
    name: f.Title || "",
    adminEmails: (f.AdminEmails || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
    logoUrl: f.LogoUrl || undefined,
    primaryColor: f.PrimaryColor || undefined,
    status: (f.Status as ProjectOrg["status"]) || "active",
    notes: f.Notes || "",
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

export async function getProjectOrgs(): Promise<ProjectOrg[]> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(ORGS_LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(`${base}?$expand=fields&$top=500`);
  return (res?.value || []).map(mapOrg).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProjectOrgById(id: string): Promise<ProjectOrg | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(ORGS_LIST);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapOrg(item) : null;
}

/** Resolve the org an admin/viewer email belongs to (admin emails OR project assignment). */
export async function getOrgForAdminEmail(email: string): Promise<ProjectOrg | null> {
  const e = email.toLowerCase();
  const orgs = await getProjectOrgs();
  return orgs.find((o) => o.adminEmails.includes(e)) || null;
}

export async function createProjectOrg(data: Omit<ProjectOrg, "id" | "createdAt">): Promise<ProjectOrg> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(ORGS_LIST), {
    fields: {
      Title: data.name,
      AdminEmails: data.adminEmails.join(","),
      LogoUrl: data.logoUrl || "",
      PrimaryColor: data.primaryColor || "",
      Status: data.status,
      Notes: data.notes || "",
      CreatedAt: now,
    },
  });
  return { ...data, id: res.id, createdAt: now };
}

export async function updateProjectOrg(id: string, data: Partial<ProjectOrg>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(ORGS_LIST);
  const fields: Record<string, string> = { UpdatedAt: new Date().toISOString() };
  if (data.name !== undefined) fields.Title = data.name;
  if (data.adminEmails !== undefined) fields.AdminEmails = data.adminEmails.join(",");
  if (data.logoUrl !== undefined) fields.LogoUrl = data.logoUrl;
  if (data.primaryColor !== undefined) fields.PrimaryColor = data.primaryColor;
  if (data.status !== undefined) fields.Status = data.status;
  if (data.notes !== undefined) fields.Notes = data.notes;
  await graphPatch(`${base}/${id}/fields`, fields);
}

export async function deleteProjectOrg(id: string): Promise<void> {
  const { deleteListItemById } = await import("@/lib/sharepoint");
  await deleteListItemById(ORGS_LIST, id);
}
