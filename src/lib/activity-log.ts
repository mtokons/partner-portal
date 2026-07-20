import "server-only";
import { createActivityLog } from "@/lib/sharepoint";
import type { ActivityLog, AuditAction } from "@/types";

export interface LogActivityInput {
  actorEmail: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  action: AuditAction;
  description: string;
  targetId?: string;
  targetEmail?: string;
  targetName?: string;
  console?: string;
}

/**
 * Best-effort request metadata (IP + user-agent). Returns empty strings when
 * headers are not available (e.g. outside a request scope).
 */
async function readRequestMeta(): Promise<{ ipAddress: string; userAgent: string }> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "";
    const userAgent = h.get("user-agent") || "";
    return { ipAddress: ip, userAgent };
  } catch {
    return { ipAddress: "", userAgent: "" };
  }
}

/**
 * Record an audit-log entry for "who did what and when". Captures the request
 * IP and user-agent automatically. Never throws — auditing must not break the
 * action it records.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const { ipAddress, userAgent } = await readRequestMeta();
    const entry: Omit<ActivityLog, "id"> = {
      ...input,
      ipAddress,
      userAgent,
      createdAt: new Date().toISOString(),
    };
    await createActivityLog(entry);
  } catch (err: any) {
    console.warn("[activity-log] logActivity failed:", err?.message || err);
  }
}
