"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import { Repository } from "@/lib/repository";
import { getPartnerByEmail } from "@/lib/sharepoint";
import type { CandidateTask, TaskStatus } from "@/types";

export async function fetchPartnerTaskBoardDataAction() {
  try {
    const user = await requirePermission("candidate.view.own");
    const partner = await getPartnerByEmail(user.email!);
    if (!partner) {
      return { success: false, error: "Partner not found" };
    }

    const partnerId = partner.id;

    // Load candidates and tasks in parallel
    const [candidates, tasks] = await Promise.all([
      Repository.candidates.getAll(partnerId).catch((e) => {
        console.error("[task-board] getAll candidates failed:", e);
        return [];
      }),
      Repository.candidates.getTasksByPartner(partnerId).catch((e) => {
        console.error("[task-board] getTasksByPartner failed:", e);
        return [];
      }),
    ]);

    return {
      success: true,
      data: {
        tasks,
        candidates: candidates.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          sccgId: c.sccgId,
          email: c.email,
        })),
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          partnerCode: partner.partnerCode || "PART",
        },
      },
    };
  } catch (error: any) {
    console.error("Fetch partner task board data error:", error);
    return { success: false, error: error.message || "Failed to load board data" };
  }
}

export async function savePartnerTaskAction(taskData: any) {
  try {
    const user = await requirePermission("candidate.create");
    const partner = await getPartnerByEmail(user.email!);
    if (!partner) return { success: false, error: "Partner not found" };

    // Validate candidate ownership
    const candidates = await Repository.candidates.getAll(partner.id);
    const candidateExists = candidates.some((c) => c.id === taskData.candidateId);
    if (!candidateExists) {
      return { success: false, error: "Invalid candidate selected or unauthorized" };
    }

    // Set partner ID on task
    taskData.partnerId = partner.id;
    taskData.createdBy = user.id;

    let saved;
    if (taskData.id && !taskData.id.startsWith("new-")) {
      // Validate task ownership first
      const existingTasks = await Repository.candidates.getTasksByPartner(partner.id);
      const isOwner = existingTasks.some((t) => t.id === taskData.id);
      if (!isOwner) return { success: false, error: "Task not found or unauthorized" };

      // Update fields
      await Repository.candidates.updateTask(taskData.id, taskData);
      saved = { ...taskData };
    } else {
      // Create new task
      const { id, ...rest } = taskData;
      rest.createdAt = new Date().toISOString();
      saved = await Repository.candidates.addTask(rest);
    }

    revalidatePath("/partner/tasks");
    return { success: true, task: saved };
  } catch (error: any) {
    console.error("Save partner task error:", error);
    return { success: false, error: error.message || "Failed to save task" };
  }
}

export async function deletePartnerTaskAction(taskId: string) {
  try {
    const user = await requirePermission("candidate.create");
    const partner = await getPartnerByEmail(user.email!);
    if (!partner) return { success: false, error: "Partner not found" };

    // Validate task ownership
    const existingTasks = await Repository.candidates.getTasksByPartner(partner.id);
    const isOwner = existingTasks.some((t) => t.id === taskId);
    if (!isOwner) return { success: false, error: "Task not found or unauthorized" };

    await Repository.candidates.deleteTask(taskId);
    revalidatePath("/partner/tasks");
    return { success: true };
  } catch (error: any) {
    console.error("Delete partner task error:", error);
    return { success: false, error: error.message || "Failed to delete task" };
  }
}

export async function movePartnerTaskAction(taskId: string, newStatus: TaskStatus) {
  try {
    const user = await requirePermission("candidate.create");
    const partner = await getPartnerByEmail(user.email!);
    if (!partner) return { success: false, error: "Partner not found" };

    // Validate task ownership
    const existingTasks = await Repository.candidates.getTasksByPartner(partner.id);
    const isOwner = existingTasks.some((t) => t.id === taskId);
    if (!isOwner) return { success: false, error: "Task not found or unauthorized" };

    await Repository.candidates.updateTask(taskId, { status: newStatus });
    revalidatePath("/partner/tasks");
    return { success: true };
  } catch (error: any) {
    console.error("Move partner task error:", error);
    return { success: false, error: error.message || "Failed to move task" };
  }
}
