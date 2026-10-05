"use server";

import { auth } from "@/auth";
import { Repository } from "@/lib/repository";
import type { CandidateTask } from "@/types";

export interface FetchExpertTasksResult {
  success: boolean;
  tasks: CandidateTask[];
  currentUserId?: string;
  currentUserEmail?: string;
  currentUserName?: string;
  candidates?: Array<{ id: string; fullName: string; sccgId: string; email?: string }>;
  error?: string;
}

/**
 * Fetches tasks that are assigned to the currently authenticated expert.
 * Filters by:
 *   - task.assignedToUserId === user.id
 *   - task.assignedToEmail === user.email
 *   - task.assignees array contains user.id or user.email
 */
export async function fetchExpertTasksAction(): Promise<FetchExpertTasksResult> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, tasks: [], error: "Unauthorized" };
    }

    const userId = user.id || "";
    const userEmail = (user.email || "").toLowerCase().trim();
    const userName = (user as { name?: string }).name || user.email || "Expert";

    const [rawTasks, rawCandidates] = await Promise.all([
      Repository.candidates.getAllTasks().catch(() => []),
      Repository.candidates.getAll().catch(() => []),
    ]);

    const candidates = (rawCandidates || []).map((c: any) => ({
      id: String(c.id || ""),
      fullName: String(c.fullName || c.name || "Candidate"),
      sccgId: String(c.sccgId || c.id || ""),
      email: c.email ? String(c.email) : undefined,
    }));

    const expertTasks = (rawTasks || []).filter((task) => {
      if (task.assignedToUserId && task.assignedToUserId === userId) {
        return true;
      }
      if (
        task.assignedToEmail &&
        task.assignedToEmail.toLowerCase().trim() === userEmail
      ) {
        return true;
      }
      if (Array.isArray(task.assignees) && task.assignees.length > 0) {
        return task.assignees.some((assignee) => {
          if (!assignee) return false;
          if (assignee.userId && assignee.userId === userId) return true;
          if (
            assignee.email &&
            assignee.email.toLowerCase().trim() === userEmail
          ) {
            return true;
          }
          return false;
        });
      }
      return false;
    });

    return {
      success: true,
      tasks: expertTasks,
      currentUserId: userId,
      currentUserEmail: user.email || "",
      currentUserName: userName,
      candidates,
    };
  } catch (error) {
    console.error("[fetchExpertTasksAction] Error:", error);
    return {
      success: false,
      tasks: [],
      error: error instanceof Error ? error.message : "Failed to load tasks",
    };
  }
}
