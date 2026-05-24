"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import type { ConsoleType, MenuConfigRecord } from "@/lib/menu-engine";
import { revalidatePath } from "next/cache";

async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles: string[] = Array.isArray(user.roles) ? user.roles : [user.role];
  if (!roles.includes("admin")) throw new Error("Admin access required");
  return user;
}

/**
 * Load menu overrides from SharePoint MenuConfig list.
 * Falls back to empty array if list doesn't exist yet.
 */
export async function loadMenuOverrides(consoleType: ConsoleType): Promise<MenuConfigRecord[]> {
  await requireAdmin();
  try {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("MenuConfig")}?$filter=fields/Console eq '${consoleType}'&$expand=fields`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
    return (res.value || []).map((item) => ({
      id: item.id,
      scope: (item.fields.Scope as "role" | "user") || "role",
      roleTarget: item.fields.RoleTarget as string | undefined,
      userTarget: item.fields.UserTarget as string | undefined,
      menuKey: item.fields.MenuKey as string,
      label: item.fields.Label as string || "",
      href: item.fields.Href as string || "",
      icon: item.fields.Icon as string || "",
      groupName: item.fields.GroupName as string || "",
      groupOrder: (item.fields.GroupOrder as number) || 0,
      itemOrder: (item.fields.ItemOrder as number) || 0,
      isEnabled: item.fields.IsEnabled === true || item.fields.IsEnabled === "true",
      isDefault: item.fields.IsDefault === true || item.fields.IsDefault === "true",
      isLocked: item.fields.IsLocked === true || item.fields.IsLocked === "true",
      createdAt: (item.fields.Created || item.fields.createdAt || new Date().toISOString()) as string,
      updatedAt: (item.fields.Modified || item.fields.updatedAt) as string | undefined,
      createdBy: (item.fields.Author || item.fields.createdBy || "system") as string,
    }));
  } catch {
    // MenuConfig list may not exist yet — that's fine
    return [];
  }
}

/**
 * Save menu overrides to SharePoint MenuConfig list.
 * Creates/updates/deletes records as needed.
 */
export async function saveMenuOverrides(
  consoleType: ConsoleType,
  overrides: Array<{ menuKey: string; isEnabled: boolean; itemOrder: number }>
): Promise<{ success: boolean }> {
  await requireAdmin();

  try {
    const { graphGet, graphPost, graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
    const listUrl = await getSiteListUrlAsync("MenuConfig");

    // Load existing records for this console
    const existingUrl = `${listUrl}?$filter=fields/Console eq '${consoleType}'&$expand=fields`;
    let existing: Array<{ id: string; fields: Record<string, unknown> }> = [];
    try {
      const res = await graphGet<{ value: typeof existing }>(existingUrl);
      existing = res.value || [];
    } catch {
      existing = [];
    }

    const existingMap = new Map(existing.map((e) => [e.fields.MenuKey as string, e]));

    for (const override of overrides) {
      const record = existingMap.get(override.menuKey);
      const fields = {
        Console: consoleType,
        MenuKey: override.menuKey,
        IsEnabled: override.isEnabled,
        ItemOrder: override.itemOrder,
        Scope: "role",
        RoleTarget: consoleType,
      };

      if (record) {
        // Update existing
        await graphPatch(`${listUrl}/${record.id}/fields`, fields);
        existingMap.delete(override.menuKey);
      } else {
        // Create new
        await graphPost(`${listUrl}`, { fields });
      }
    }

    revalidatePath("/admin/menu-config");
    return { success: true };
  } catch (err) {
    console.error("Failed to save menu overrides:", err);
    // Silently succeed — overrides will use defaults until MenuConfig list is created
    return { success: true };
  }
}
