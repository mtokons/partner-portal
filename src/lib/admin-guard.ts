import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";

/** Returns the SessionUser if the caller has the admin role, otherwise redirects. */
export async function requireAdmin(redirectTo: string = "/login"): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect(redirectTo);
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/dashboard");
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
  if (!roles.includes("admin")) {
    throw new Error("FORBIDDEN: admin role required");
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
  if (!roles.includes("admin") && !roles.includes("school-manager")) {
    redirect("/dashboard");
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
