import "server-only";
import { getEffectiveUser, type EffectiveUser } from "@/lib/effective-user";
import { getOrgForAdminEmail, getProjectOrgs } from "@/lib/project-orgs";
import type { ProjectOrg } from "@/types";

export interface PpmsContext {
  user: EffectiveUser;
  roles: string[];
  isSccgAdmin: boolean;        // SCCG platform admin — manages every org
  isOrgAdmin: boolean;         // project-partner-admin — manages their own org
  isViewer: boolean;           // project-partner — read only
  org: ProjectOrg | null;      // resolved org for org-admins/viewers
  allOrgs: ProjectOrg[];       // populated for SCCG admins (org switcher)
}

/** Resolve the current PPMS user, their role tier and org scope. Returns null if not signed in. */
export async function getPpmsContext(): Promise<PpmsContext | null> {
  const user = await getEffectiveUser();
  if (!user) return null;
  const roles = (user.roles?.length ? user.roles : [user.role]).map((r) => r.toLowerCase());
  const isSccgAdmin = roles.includes("admin");
  const isOrgAdmin = roles.includes("project-partner-admin");
  const isViewer = roles.includes("project-partner") && !isOrgAdmin && !isSccgAdmin;

  let org: ProjectOrg | null = null;
  let allOrgs: ProjectOrg[] = [];
  if (isSccgAdmin) {
    allOrgs = await getProjectOrgs();
    org = allOrgs[0] || null;
  } else if (isOrgAdmin || isViewer) {
    // scoped by the orgId stored on their Firestore profile
    const { getOrgIdForUserEmail } = await import("@/lib/ppms-users");
    const { getProjectOrgById } = await import("@/lib/project-orgs");
    const orgId = await getOrgIdForUserEmail(user.email);
    org = orgId ? await getProjectOrgById(orgId) : await getOrgForAdminEmail(user.email);
  }
  return { user, roles, isSccgAdmin, isOrgAdmin, isViewer, org, allOrgs };
}

/** Guard for management pages/actions — only SCCG admins or org admins may pass. */
export async function requirePpmsManager(): Promise<PpmsContext> {
  const ctx = await getPpmsContext();
  if (!ctx) throw new Error("Not authenticated");
  if (!ctx.isSccgAdmin && !ctx.isOrgAdmin) throw new Error("Forbidden: management access requires an org-admin role");
  return ctx;
}

/** True when the manager may act on the given org (SCCG admin = any org). */
export function canManageOrg(ctx: PpmsContext, orgId: string | undefined): boolean {
  if (ctx.isSccgAdmin) return true;
  if (!orgId || !ctx.org) return false;
  return ctx.org.id === orgId;
}

/**
 * Resolve the projects a PPMS user may view. SCCG admins see every project;
 * org admins + viewers see their org's projects, falling back to direct
 * partner-assigned projects (backwards-compatible with non-org partners).
 */
export async function getPpmsProjects(ctx: PpmsContext): Promise<import("@/types").Project[]> {
  const { getProjects, getProjectsForOrg, getProjectsForPartner } = await import("@/lib/projects");
  if (ctx.isSccgAdmin) return getProjects();
  let projects = ctx.org ? await getProjectsForOrg(ctx.org.id) : [];
  if (projects.length === 0) projects = await getProjectsForPartner(ctx.user.email);
  return projects;
}
