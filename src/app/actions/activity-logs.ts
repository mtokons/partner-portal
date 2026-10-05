"use server";

import { assertAdmin } from "@/lib/admin-guard";
import { getActivityLogs } from "@/lib/sharepoint";
import type { ActivityLog } from "@/types";

export interface UnifiedActivityLogFilter {
  actorEmail?: string;
  action?: string;
  limit?: number;
}

export interface ActivitySummaryStats {
  totalCount: number;
  uniqueActors: number;
  loginsToday: number;
  adminActionsCount: number;
}

export async function fetchAllUserActivities(filters?: UnifiedActivityLogFilter): Promise<{
  logs: ActivityLog[];
  stats: ActivitySummaryStats;
}> {
  // Ensure the caller is an authorized admin
  await assertAdmin();

  // 1. Fetch from SharePoint ActivityLog
  let spLogs: ActivityLog[] = [];
  try {
    spLogs = await getActivityLogs({
      actorEmail: filters?.actorEmail,
      action: filters?.action,
      limit: filters?.limit ?? 1000,
    });
  } catch (err: unknown) {
    console.warn("[activity-logs] Failed to fetch SharePoint ActivityLog:", err);
  }

  // 2. Best-effort fetch from Firestore auditLogs
  let fsLogs: ActivityLog[] = [];
  try {
    const { getAuditLogs } = await import("@/lib/audit-log");
    const rawFs = await getAuditLogs({
      action: filters?.action,
      limitCount: 200,
    });

    fsLogs = (rawFs || []).map((entry) => {
      const ts = entry.createdAt;
      let isoDate = "";
      if (ts && typeof ts === "object" && "toDate" in ts && typeof (ts as any).toDate === "function") {
        isoDate = (ts as any).toDate().toISOString();
      } else if (ts && typeof ts === "string") {
        isoDate = ts;
      }

      const email = String(entry.actorEmail || "");
      const actionName = String(entry.action || "other");
      const targetType = entry.targetType ? String(entry.targetType) : "";
      const targetId = entry.targetId ? String(entry.targetId) : "";

      let desc = String(entry.description || "");
      if (!desc) {
        desc = `${email || "User"} performed ${actionName}${targetType ? ` on ${targetType}` : ""}${targetId ? ` (${targetId})` : ""}`;
      }

      return {
        id: String(entry.sccgId || entry.id || `fs-${Math.random()}`),
        actorId: entry.actorId ? String(entry.actorId) : undefined,
        actorEmail: email,
        actorName: email ? email.split("@")[0] : undefined,
        actorRole: entry.actorRole ? String(entry.actorRole) : undefined,
        action: actionName as ActivityLog["action"],
        description: desc,
        targetId: targetId || undefined,
        targetEmail: entry.targetEmail ? String(entry.targetEmail) : undefined,
        targetName: targetType || undefined,
        console: entry.console ? String(entry.console) : undefined,
        ipAddress: entry.ipAddress ? String(entry.ipAddress) : undefined,
        userAgent: entry.userAgent ? String(entry.userAgent) : undefined,
        createdAt: isoDate,
      };
    });
  } catch {
    // Firestore audit retrieval is optional/best-effort
  }

  // 3. Merge & Deduplicate
  const seen = new Set<string>();
  const merged: ActivityLog[] = [];

  for (const log of [...spLogs, ...fsLogs]) {
    // Deduplication signature based on time within 10s + actor + action
    const timeKey = log.createdAt ? log.createdAt.slice(0, 16) : "";
    const sig = `${log.actorEmail}_${log.action}_${timeKey}_${log.description}`;
    if (!seen.has(sig) && !seen.has(log.id)) {
      seen.add(sig);
      seen.add(log.id);
      merged.push(log);
    }
  }

  // Sort descending by date
  merged.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  // Calculate stats
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const distinctActors = new Set<string>();
  let loginsToday = 0;
  let adminActionsCount = 0;

  for (const item of merged) {
    if (item.actorEmail) distinctActors.add(item.actorEmail.toLowerCase());
    const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    if (item.action === "login" && itemTime >= startOfToday) {
      loginsToday++;
    }
    if (
      item.action === "impersonate_start" ||
      item.action === "impersonate_stop" ||
      item.action === "user_delete" ||
      item.action === "user_create" ||
      item.action === "role_change" ||
      item.action === "partner_approve" ||
      item.action === "partner_reject"
    ) {
      adminActionsCount++;
    }
  }

  return {
    logs: merged,
    stats: {
      totalCount: merged.length,
      uniqueActors: distinctActors.size,
      loginsToday,
      adminActionsCount,
    },
  };
}
