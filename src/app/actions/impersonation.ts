"use server";

import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-guard";
import { setImpersonationCookie, clearImpersonationCookie } from "@/lib/impersonation";
import { resolveConsole } from "@/lib/menu-engine";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";

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

    // Determine where the impersonated user's primary console is
    const console = resolveConsole(targetRoles);
    const consoleMap: Record<string, string> = {
      admin: "/admin/overview",
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
    const redirectTo = consoleMap[console] || "/dashboard";

    // For partner targets, resolve the SharePoint Partners list id so partner
    // pages/actions that gate on `user.partnerId` work during impersonation.
    let targetPartnerId: string | undefined;
    const isPartnerTarget = targetRoles.some((r) =>
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
      targetId,
      targetEmail,
      targetName,
      targetRoles,
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
        description: `${admin.name || admin.email} started viewing as ${targetName || targetEmail}`,
        targetId,
        targetEmail,
        targetName,
        console: "admin",
      });
    } catch { /* non-fatal */ }

    return { success: true, redirectTo };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to start impersonation" };
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
