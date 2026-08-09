import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { resolveDashboardForRoles } from "@/lib/access-policy";

/**
 * True for roles that should see ALL partners' data and manage it directly:
 * legacy admin/project-admin plus the new SCCG Admin and SCCG Staff roles
 * (both have full Candidate Gallery access per the SCCG requirement doc).
 */
export function isAdminEquivalent(roles: string[]): boolean {
  const lower = roles.map((r) => (r || "").toLowerCase());
  return lower.some((r) => ["admin", "project-admin", "sccg-admin", "sccg-staff"].includes(r));
}

export function resolveRoleDashboard(roles: string[]): string {
  return resolveDashboardForRoles(roles) || "/access-denied";
}

/** Returns the SessionUser if the caller has the admin role, otherwise redirects to role dashboard. */
export async function requireAdmin(redirectTo: string = "/login"): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect(redirectTo);
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  const lowerRoles = roles.map(r => r.toLowerCase());
  if (!lowerRoles.includes("admin") && !lowerRoles.includes("project-admin") && !lowerRoles.includes("sccg-admin")) {
    redirect(resolveRoleDashboard(roles));
  }
  return user;
}

/** Throws if the caller is not admin (use inside server actions instead of redirect). */
export async function assertAdmin(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHENTICATED");
  }
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  const lowerRoles = roles.map(r => r.toLowerCase());
  if (!lowerRoles.includes("admin") && !lowerRoles.includes("project-admin") && !lowerRoles.includes("sccg-admin")) {
    throw new Error("FORBIDDEN: admin role required");
  }
  return user;
}

/** Allows SCCG Admin and SCCG Staff (plus legacy admin). Use on shared SCCG console pages. */
export async function requireSccgAccess(redirectTo: string = "/login"): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect(redirectTo);
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  const lowerRoles = roles.map(r => r.toLowerCase());
  if (!lowerRoles.some(r => ["admin", "sccg-admin", "sccg-staff"].includes(r))) {
    redirect(resolveRoleDashboard(roles));
  }
  return user;
}

/** Allows only SCCG Admin (plus legacy admin). Use on admin-only SCCG modules. */
export async function requireSccgAdmin(redirectTo: string = "/login"): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect(redirectTo);
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  const lowerRoles = roles.map(r => r.toLowerCase());
  if (!lowerRoles.some(r => ["admin", "sccg-admin"].includes(r))) {
    redirect(resolveRoleDashboard(roles));
  }
  return user;
}

/**
 * Allows both admin and school-manager roles.
 * Use in all /admin/school/* pages and actions.
 */
export async function requireSchoolAccess(redirectTo: string = "/login"): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect(redirectTo);
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  const lowerRoles = roles.map(r => r.toLowerCase());
  if (!lowerRoles.includes("admin") && !lowerRoles.includes("school-manager")) {
    redirect(resolveRoleDashboard(roles));
  }
  return user;
}

/** Throws if caller has neither admin nor school-manager role. */
export async function assertSchoolAccess(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin") && !roles.includes("school-manager")) {
    throw new Error("FORBIDDEN: school-manager or admin role required");
  }
  return user;
}

/**
 * Returns the configured super-admin emails (lowercased) from SUPER_ADMIN_EMAILS.
 * Comma-separated. Empty array when not configured.
 */
export function getSuperAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * True when the given email belongs to a super-admin.
 * Mirrors the B2B convention: when no SUPER_ADMIN_EMAILS list is configured,
 * any admin is treated as a super-admin (caller must already be admin).
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  const list = getSuperAdminEmails();
  if (list.length === 0) return true; // not configured → fall back to admin role
  if (!email) return false;
  return list.includes(email.toLowerCase());
}

/**
 * Throws unless the caller is an admin AND (when SUPER_ADMIN_EMAILS is configured)
 * is listed as a super-admin. Use to guard destructive operations.
 */
export async function assertSuperAdmin(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) {
    throw new Error("FORBIDDEN: admin role required");
  }
  if (!isSuperAdminEmail(user.email)) {
    throw new Error("FORBIDDEN: super-admin required");
  }
  return user;
}
