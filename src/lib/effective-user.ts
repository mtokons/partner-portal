/**
 * Effective user resolution for admin "View As" impersonation.
 *
 * When a real admin has an active impersonation cookie, dashboards and
 * data-loading paths should operate on the *target* user's identity
 * (id / email / name / roles) — not the admin's own. This helper centralizes
 * that decision so every console renders the impersonated user's real data.
 *
 * Security: only a session whose REAL roles include "admin" can impersonate.
 * For non-admin sessions the impersonation cookie is ignored entirely.
 */
import { auth } from "@/auth";
import { getImpersonationSession } from "@/lib/impersonation";
import type { SessionUser } from "@/types";

export interface EffectiveUser extends SessionUser {
  /** True when an admin is currently viewing as another user. */
  isImpersonating: boolean;
}

/**
 * Returns the effective identity for the current request.
 * - If a real admin is impersonating, returns the target user's identity
 *   (id, email, name, roles, role) layered over the admin session.
 * - Otherwise returns the real session user unchanged.
 * Returns null when there is no authenticated session.
 */
export async function getEffectiveUser(): Promise<EffectiveUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as SessionUser;

  const realRoles = (user.roles?.length ? user.roles : [user.role]).filter(Boolean) as string[];
  const isRealAdmin = realRoles.map((r) => r.toLowerCase()).includes("admin");

  if (isRealAdmin) {
    const imp = await getImpersonationSession();
    if (imp && imp.targetId) {
      return {
        ...user,
        id: imp.targetId,
        email: imp.targetEmail,
        name: imp.targetName,
        roles: imp.targetRoles,
        role: (imp.targetRoles[0] as SessionUser["role"]) || user.role,
        // Override partnerId with the target's so partner pages/actions that
        // gate on user.partnerId load the impersonated partner's data.
        partnerId: imp.targetPartnerId ?? user.partnerId,
        isImpersonating: true,
      };
    }
  }

  return { ...user, isImpersonating: false };
}

/**
 * Session-shaped wrapper around {@link getEffectiveUser}.
 *
 * Drop-in replacement for `auth()` inside role consoles (partner / customer /
 * expert / student / shared) where data must be loaded for the *effective*
 * identity. When a real admin is impersonating, `session.user` is the target
 * user; otherwise it is the real session user. Returns null when unauthenticated.
 *
 * Security: impersonation is only honoured for sessions whose REAL roles
 * include "admin" (enforced inside getEffectiveUser). For everyone else this
 * behaves identically to `auth()`.
 */
export async function getEffectiveSession(): Promise<{ user: EffectiveUser } | null> {
  const user = await getEffectiveUser();
  if (!user) return null;
  return { user };
}

