"use server";

import { assertAdmin } from "@/lib/admin-guard";
import {
  getUserMenuOverrides,
  replaceUserMenuOverrides,
  type UserMenuItemInput,
} from "@/lib/menu-overrides";
import { writeAuditLog } from "@/lib/audit-log";
import type { MenuConfigRecord } from "@/lib/menu-engine";

/** Load the current user-scope menu overrides for the admin menu-access dialog. */
export async function getUserMenuOverridesAction(
  email: string
): Promise<{ success: boolean; overrides?: MenuConfigRecord[]; error?: string }> {
  try {
    await assertAdmin();
    const overrides = await getUserMenuOverrides(email);
    return { success: true, overrides };
  } catch (err: any) {
    console.error("getUserMenuOverridesAction error:", err);
    return { success: false, error: err?.message || "Failed to load menu access." };
  }
}

/** Replace a user's menu overrides (enable/disable defaults + grant extra items). */
export async function saveUserMenuOverridesAction(
  email: string,
  items: UserMenuItemInput[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await assertAdmin();
    await replaceUserMenuOverrides(email, items, actor.email || "");
    try {
      await writeAuditLog({
        action: "user.menu.update",
        actorId: actor.id || "",
        actorEmail: actor.email || "",
        targetId: (email || "").toLowerCase().trim(),
        targetType: "user",
        after: { overrideCount: items.length },
        metadata: { email: (email || "").toLowerCase().trim() },
      });
    } catch {
      /* audit failure must not block the operation */
    }
    return { success: true };
  } catch (err: any) {
    console.error("saveUserMenuOverridesAction error:", err);
    return { success: false, error: err?.message || "Failed to save menu access." };
  }
}
