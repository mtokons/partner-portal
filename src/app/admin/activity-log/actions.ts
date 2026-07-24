"use server";

import { requireAdmin } from "@/lib/admin-guard";
import { getActivityLogs } from "@/lib/sharepoint";
import type { ActivityLog } from "@/types";

export async function fetchActivityLogsAction(opts?: {
  actorEmail?: string;
  action?: string;
  limit?: number;
}): Promise<{ success: boolean; data?: ActivityLog[]; error?: string }> {
  try {
    await requireAdmin();
    const data = await getActivityLogs({
      actorEmail: opts?.actorEmail || undefined,
      action: opts?.action || undefined,
      limit: opts?.limit ?? 500,
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load activity log" };
  }
}
