"use server";

import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-guard";
import { setImpersonationCookie, clearImpersonationCookie } from "@/lib/impersonation";
import { resolveConsole } from "@/lib/menu-engine";
import { resolveDashboardForRoles } from "@/lib/access-policy";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getAllManagedUsers } from "@/lib/admin-users";

/**
 * Start impersonating a target user.
 * Only admin-role sessions may call this.
 */
export async function startImpersonationAction(
  targetEmail: string,
  targetName: string,
  targetRoles: string[],
  targetId: string
): Promise<{ success: boolean; error?: string; redirectTo?: string }> {
  try {
    await assertAdmin();
    const session = await auth();
    const admin = session?.user as SessionUser | undefined;
    if (!admin?.email) return { success: false, error: "Admin session not found" };

    // Re-resolve the target from the server-side registry. The browser-provided
    // role is only a UI hint and must never control authorization or routing.
    const managedTarget = (await getAllManagedUsers()).find(
      (user) => user.email.toLowerCase() === targetEmail.toLowerCase().trim()
    );
    if (!managedTarget) return { success: false, error: "Target user could not be resolved." };
    if (managedTarget.status !== "active") return { success: false, error: "Target user is not active." };

    const resolvedTargetRoles = Array.from(new Set([managedTarget.primaryRole, ...managedTarget.roles]));
    const resolvedTargetName = managedTarget.displayName || targetName;
    const resolvedTargetId = managedTarget.id || targetId;
    const console = resolveConsole(resolvedTargetRoles);
    const consoleMap: Record<string, string> = {
      admin: "/admin/overview",
      sccg: "/sccg/dashboard",
      "school-admin": "/admin/school",
      partner: "/partner/dashboard",
      expert: "/expert/dashboard",
      customer: "/customer/dashboard",
      student: "/student/dashboard",
      "job-seeker": "/job-seeker/dashboard",
      "job-partner": "/job-partner/dashboard",
      "ausbildung-seeker": "/ausbildung/seeker/dashboard",
      "ausbildung-partner": "/ausbildung/partner/dashboard",
    };
    const redirectTo = resolveDashboardForRoles(resolvedTargetRoles) || consoleMap[console] || "/access-denied";

    // For partner targets, resolve the SharePoint Partners list id so partner
    // pages/actions that gate on `user.partnerId` work during impersonation.
    let targetPartnerId: string | undefined;
    const isPartnerTarget = resolvedTargetRoles.some((r) =>
      ["partner", "partner-individual", "partner-institutional"].includes(r.toLowerCase())
    );
    if (isPartnerTarget && targetEmail) {
      try {
        const { getPartnerByEmail } = await import("@/lib/sharepoint");
        const p = await getPartnerByEmail(targetEmail);
        targetPartnerId = p?.id || undefined;
      } catch {
        // Non-fatal: partner record may not exist yet.
      }
    }

    await setImpersonationCookie({
      adminEmail: admin.email,
      adminName: admin.name || "Admin",
      targetId: resolvedTargetId,
      targetEmail,
      targetName: resolvedTargetName,
      targetRoles: resolvedTargetRoles,
      targetPrimaryConsole: console,
      targetPartnerId,
    });

    try {
      const { logActivity } = await import("@/lib/activity-log");
      await logActivity({
        actorEmail: admin.email,
        actorId: admin.id,
        actorName: admin.name || "Admin",
        actorRole: "admin",
        action: "impersonate_start",
        description: `${admin.name || admin.email} started viewing as ${resolvedTargetName || targetEmail}`,
        targetId: resolvedTargetId,
        targetEmail,
        targetName: resolvedTargetName,
        console: "admin",
      });
    } catch { /* non-fatal */ }

    return { success: true, redirectTo };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to start impersonation";
    return { success: false, error: message };
  }
}

/**
 * Stop impersonation and return to admin console.
 */
export async function stopImpersonationAction(): Promise<void> {
  try {
    const { getImpersonationSession } = await import("@/lib/impersonation");
    const imp = await getImpersonationSession();
    if (imp) {
      const { logActivity } = await import("@/lib/activity-log");
      await logActivity({
        actorEmail: imp.adminEmail,
        actorName: imp.adminName,
        actorRole: "admin",
        action: "impersonate_stop",
        description: `${imp.adminName || imp.adminEmail} stopped viewing as ${imp.targetName || imp.targetEmail}`,
        targetId: imp.targetId,
        targetEmail: imp.targetEmail,
        targetName: imp.targetName,
        console: "admin",
      });
    }
  } catch { /* non-fatal */ }
  await clearImpersonationCookie();
  redirect("/admin/users");
}
