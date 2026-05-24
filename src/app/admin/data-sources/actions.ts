"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { APP_SP_LISTS, APP_SP_LIST_NAMES, APP_FIRESTORE_COLLECTIONS } from "./app-lists";

interface SpListSummary {
  id: string;
  displayName: string;
  description?: string;
  webUrl?: string;
  itemCount?: number;
  createdAt?: string;
  template?: string;
  hidden?: boolean;
  /** Resolved app metadata when this list is one of ours */
  appGroup?: string;
  appUsedBy?: string[];
  appDescription?: string;
}

interface SpListItemsPage {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  itemCount: number;
  hasMore: boolean;
  error?: string;
}

interface UsersPage {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  total: number;
  error?: string;
}

async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin only");
  return user;
}

/**
 * List every SharePoint list on the configured site.
 */
export async function fetchAllSpLists(): Promise<{ lists: SpListSummary[]; error?: string }> {
  await requireAdmin();
  try {
    const { graphGet, resolveSiteId } = await import("@/lib/graph");
    const siteId = await resolveSiteId();
    const result: SpListSummary[] = [];
    let url: string | null = `/sites/${siteId}/lists?$top=200&$select=id,displayName,description,webUrl,createdDateTime,list`;
    while (url) {
      const res: { value: Array<Record<string, unknown>>; "@odata.nextLink"?: string } = await graphGet(url);
      for (const l of res.value) {
        const list = l.list as { template?: string; hidden?: boolean } | undefined;
        result.push({
          id: String(l.id),
          displayName: String(l.displayName || ""),
          description: l.description ? String(l.description) : undefined,
          webUrl: l.webUrl ? String(l.webUrl) : undefined,
          createdAt: l.createdDateTime ? String(l.createdDateTime) : undefined,
          template: list?.template,
          hidden: !!list?.hidden,
        });
      }
      const next = res["@odata.nextLink"];
      url = next ? next.replace("https://graph.microsoft.com/v1.0", "") : null;
    }
    // Filter down to only the lists this app actually uses, and decorate
    // them with the canonical app metadata (group / usedBy / description).
    const filtered = result.filter((l) => APP_SP_LIST_NAMES.has(l.displayName));
    const byName = new Map(APP_SP_LISTS.map((e) => [e.name, e]));
    for (const l of filtered) {
      const meta = byName.get(l.displayName);
      if (meta) {
        l.appGroup = meta.group;
        l.appUsedBy = meta.usedBy;
        l.appDescription = meta.description;
      }
    }
    // Fetch item counts in parallel (best effort).
    await Promise.all(
      filtered.map(async (l) => {
        try {
          const c = await graphGet<{ "@odata.count": number }>(
            `/sites/${siteId}/lists/${l.id}/items?$count=true&$top=1&$select=id`
          );
          l.itemCount = Number(c["@odata.count"] || 0);
        } catch {
          // leave undefined
        }
      })
    );
    filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { lists: filtered };
  } catch (err) {
    return { lists: [], error: (err as Error).message };
  }
}

/**
 * Fetch top N items of a SharePoint list with their fields, returning a generic
 * column/row table the UI can render without knowing the schema.
 */
export async function fetchSpListItems(listId: string, top: number = 50): Promise<SpListItemsPage> {
  await requireAdmin();
  try {
    const { graphGet, resolveSiteId } = await import("@/lib/graph");
    const siteId = await resolveSiteId();
    const safeTop = Math.min(Math.max(1, Math.floor(top)), 200);
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown>; createdDateTime?: string }> }>(
      `/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=${safeTop}`
    );
    const rows = res.value.map((it) => ({
      _spItemId: it.id,
      _createdAt: it.createdDateTime,
      ...it.fields,
    }));
    const colSet = new Set<string>(["_spItemId"]);
    for (const r of rows) for (const k of Object.keys(r)) colSet.add(k);
    // Hide system columns by default.
    const hidden = new Set([
      "@odata.etag",
      "_UIVersionString",
      "ContentType",
      "Modified",
      "Created",
      "AuthorLookupId",
      "EditorLookupId",
      "_ComplianceFlags",
      "_ComplianceTag",
      "_ComplianceTagWrittenTime",
      "_ComplianceTagUserId",
      "AppAuthorLookupId",
      "AppEditorLookupId",
      "Attachments",
      "Edit",
      "LinkTitleNoMenu",
      "LinkTitle",
      "ItemChildCount",
      "FolderChildCount",
      "_Level",
      "_IsCurrentVersion",
      "_HasCopyDestinations",
      "_CopySource",
    ]);
    const columns = [...colSet].filter((c) => !hidden.has(c));
    return { columns, rows, itemCount: rows.length, hasMore: rows.length >= safeTop };
  } catch (err) {
    return { columns: [], rows: [], itemCount: 0, hasMore: false, error: (err as Error).message };
  }
}

/**
 * Fetch tenant users via Microsoft Graph.
 */
export async function fetchTenantUsers(top: number = 100): Promise<UsersPage> {
  await requireAdmin();
  try {
    const { graphGet } = await import("@/lib/graph");
    const safeTop = Math.min(Math.max(1, Math.floor(top)), 500);
    const res = await graphGet<{ value: Array<Record<string, unknown>> }>(
      `/users?$top=${safeTop}&$select=id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime`
    );
    const rows = res.value.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      userPrincipalName: u.userPrincipalName,
      mail: u.mail,
      jobTitle: u.jobTitle,
      department: u.department,
      accountEnabled: u.accountEnabled,
      createdDateTime: u.createdDateTime,
    }));
    return {
      columns: ["displayName", "userPrincipalName", "mail", "jobTitle", "department", "accountEnabled", "createdDateTime", "id"],
      rows,
      total: rows.length,
    };
  } catch (err) {
    return { columns: [], rows: [], total: 0, error: (err as Error).message };
  }
}

/**
 * Application users: read from the Firestore `users` collection (used by NextAuth).
 */
export async function fetchAppUsers(): Promise<UsersPage> {
  await requireAdmin();
  try {
    const { getAdminFirestore } = await import("@/lib/firebase-admin");
    const snap = await getAdminFirestore().collection("users").limit(500).get();
    const rows = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        name: data.name,
        email: data.email,
        role: data.role,
        roles: Array.isArray(data.roles) ? (data.roles as string[]).join(", ") : data.roles,
        sccgId: data.sccgId,
        status: data.status,
        partnerId: data.partnerId,
        customerId: data.customerId,
        expertId: data.expertId,
        createdAt: data.createdAt,
      };
    });
    return {
      columns: ["name", "email", "role", "roles", "sccgId", "status", "partnerId", "customerId", "expertId", "createdAt", "id"],
      rows,
      total: rows.length,
    };
  } catch (err) {
    return { columns: [], rows: [], total: 0, error: (err as Error).message };
  }
}

/**
 * Connection diagnostics so admins can see whether the app is in mock mode.
 */
export async function fetchDataSourceDiagnostics() {
  await requireAdmin();
  const { getSharePointConnectionInfo } = await import("@/lib/sharepoint");
  const info = await getSharePointConnectionInfo();
  return {
    ...info,
    siteUrl: process.env.SHAREPOINT_SITE_URL || null,
    nextAuthUrl: process.env.NEXTAUTH_URL || null,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
  };
}

/**
 * Feature → data source mapping for the admin Data Sources page.
 * Always reflects the current canonical registry plus live presence
 * info from SharePoint (item counts and a "missing" flag).
 */
export async function fetchFeatureMapping() {
  await requireAdmin();
  const presence = new Map<string, { itemCount?: number; missing: boolean }>();
  try {
    const { graphGet, resolveSiteId } = await import("@/lib/graph");
    const siteId = await resolveSiteId();
    let url: string | null = `/sites/${siteId}/lists?$top=200&$select=id,displayName`;
    const live = new Map<string, string>();
    while (url) {
      const res: { value: Array<{ id: string; displayName: string }>; "@odata.nextLink"?: string } =
        await graphGet(url);
      for (const l of res.value) live.set(l.displayName, l.id);
      const next = res["@odata.nextLink"];
      url = next ? next.replace("https://graph.microsoft.com/v1.0", "") : null;
    }
    await Promise.all(
      APP_SP_LISTS.map(async (entry) => {
        const id = live.get(entry.name);
        if (!id) {
          presence.set(entry.name, { missing: true });
          return;
        }
        try {
          const c = await graphGet<{ "@odata.count": number }>(
            `/sites/${siteId}/lists/${id}/items?$count=true&$top=1&$select=id`
          );
          presence.set(entry.name, { itemCount: Number(c["@odata.count"] || 0), missing: false });
        } catch {
          presence.set(entry.name, { missing: false });
        }
      })
    );
  } catch {
    // Leave presence empty; mapping is still rendered without live counts.
  }

  const spLists = APP_SP_LISTS.map((entry) => ({
    ...entry,
    itemCount: presence.get(entry.name)?.itemCount,
    missing: presence.get(entry.name)?.missing ?? false,
  }));

  return {
    spLists,
    firestore: APP_FIRESTORE_COLLECTIONS,
  };
}
