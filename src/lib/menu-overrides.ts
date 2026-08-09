/**
 * Menu Overrides — per-user and per-role sidebar customization.
 *
 * Stored in Firestore collection `menuOverrides`. Each document mirrors the
 * `MenuConfigRecord` shape consumed by `resolveMenu()` in menu-engine.
 *
 * Server-side only (Admin SDK). Loaded by console layouts and passed to
 * `ConsoleShell` so admins can enable/disable default menu items for a user or
 * grant them access to additional (real, existing) menu routes.
 */

import { getAdminFirestore } from "@/lib/firebase-admin";
import { getAllAvailableMenuItems } from "@/lib/menu-engine";
import type { MenuConfigRecord } from "@/lib/menu-engine";

const COLLECTION = "menuOverrides";

function toRecord(id: string, d: Record<string, any>): MenuConfigRecord {
  return {
    id,
    scope: d.scope === "role" ? "role" : "user",
    roleTarget: d.roleTarget || undefined,
    userTarget: d.userTarget || undefined,
    menuKey: String(d.menuKey || ""),
    label: String(d.label || ""),
    href: String(d.href || ""),
    icon: String(d.icon || "Circle"),
    groupName: String(d.groupName || "General"),
    groupOrder: Number(d.groupOrder ?? 99),
    itemOrder: Number(d.itemOrder ?? 99),
    isEnabled: d.isEnabled !== false,
    isDefault: !!d.isDefault,
    isLocked: !!d.isLocked,
    createdAt: String(d.createdAt || ""),
    updatedAt: d.updatedAt ? String(d.updatedAt) : undefined,
    createdBy: String(d.createdBy || ""),
  };
}

/** All user-scope overrides for a single user (by email). */
export async function getUserMenuOverrides(email: string): Promise<MenuConfigRecord[]> {
  const clean = (email || "").toLowerCase().trim();
  if (!clean) return [];
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection(COLLECTION)
      .where("scope", "==", "user")
      .where("userTarget", "==", clean)
      .get();
    return snap.docs.map((doc) => toRecord(doc.id, doc.data()));
  } catch (err) {
    console.warn("[menu-overrides] getUserMenuOverrides failed:", err);
    return [];
  }
}

/** All role-scope overrides that apply to any of the supplied roles. */
export async function getRoleMenuOverrides(roles: string[]): Promise<MenuConfigRecord[]> {
  const clean = Array.from(
    new Set((roles || []).map((r) => (r || "").toLowerCase().trim()).filter(Boolean))
  ).slice(0, 30); // Firestore 'in' supports up to 30 values
  if (!clean.length) return [];
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection(COLLECTION)
      .where("scope", "==", "role")
      .where("roleTarget", "in", clean)
      .get();
    return snap.docs.map((doc) => toRecord(doc.id, doc.data()));
  } catch (err) {
    console.warn("[menu-overrides] getRoleMenuOverrides failed:", err);
    return [];
  }
}

/** Combined role + user overrides for a rendering layout. */
export async function getMenuOverridesForUser(
  email: string | null | undefined,
  roles: string[]
): Promise<{ roleOverrides: MenuConfigRecord[]; userOverrides: MenuConfigRecord[] }> {
  const [roleOverrides, userOverrides] = await Promise.all([
    getRoleMenuOverrides(roles),
    getUserMenuOverrides(email || ""),
  ]);
  return { roleOverrides, userOverrides };
}

export interface UserMenuItemInput {
  menuKey: string;
  label: string;
  href: string;
  icon: string;
  groupName: string;
  groupOrder: number;
  itemOrder: number;
  isEnabled: boolean;
}

/**
 * Replace ALL user-scope overrides for a user in a single atomic batch.
 * Passing an empty array clears every override (restores defaults).
 */
export async function replaceUserMenuOverrides(
  email: string,
  items: UserMenuItemInput[],
  actorEmail: string
): Promise<void> {
  const clean = (email || "").toLowerCase().trim();
  if (!clean) throw new Error("A user email is required.");

  const catalog = new Map(getAllAvailableMenuItems().map((item) => [item.key, item]));
  const seen = new Set<string>();
  for (const item of items) {
    const known = catalog.get(item.menuKey);
    if (!known) throw new Error(`Unknown menu item: ${item.menuKey}`);
    if (seen.has(item.menuKey)) throw new Error(`Duplicate menu item: ${item.menuKey}`);
    if (item.href !== known.href) throw new Error(`Menu route does not match its catalog entry: ${item.menuKey}`);
    seen.add(item.menuKey);
  }

  const db = getAdminFirestore();
  const col = db.collection(COLLECTION);

  const existing = await col
    .where("scope", "==", "user")
    .where("userTarget", "==", clean)
    .get();

  const batch = db.batch();
  existing.docs.forEach((doc) => batch.delete(doc.ref));

  const now = new Date().toISOString();
  for (const item of items) {
    const ref = col.doc();
    batch.set(ref, {
      scope: "user",
      userTarget: clean,
      menuKey: item.menuKey,
      label: item.label,
      href: item.href,
      icon: item.icon,
      groupName: item.groupName,
      groupOrder: item.groupOrder,
      itemOrder: item.itemOrder,
      isEnabled: item.isEnabled,
      isDefault: false,
      isLocked: false,
      createdAt: now,
      createdBy: actorEmail || "",
    });
  }

  await batch.commit();
}
