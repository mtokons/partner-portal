"use server";

import { requirePermission } from "@/lib/permissions";
import { Repository } from "@/lib/repository";
import type { Expert, Session } from "@/types";

export async function fetchSessionOverviewAction(): Promise<{
  success: boolean;
  data?: { sessions: Session[]; experts: Expert[] };
  error?: string;
}> {
  try {
    await requirePermission("session.view.all");
    const [sessions, experts] = await Promise.all([
      Repository.sessions.getAll(),
      Repository.experts.getAll(),
    ]);
    return { success: true, data: { sessions, experts } };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load sessions" };
  }
}
