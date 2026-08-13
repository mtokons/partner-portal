"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import { Repository } from "@/lib/repository";
import type { CandidateTask, CandidateTaskFlow, TaskStatus } from "@/types";

export async function fetchSccgTaskBoardDataAction() {
  try {
    await requirePermission("candidate.view.all");
    const [candidates, tasks, partners, users] = await Promise.all([
      Repository.candidates.getAll(),
      Repository.candidates.getAllTasks(),
      Repository.partners.getAll(),
      Repository.users.getAll(),
    ]);

    return {
      success: true,
      data: {
        tasks,
        candidates: candidates.map((candidate) => ({
          id: candidate.id,
          fullName: candidate.fullName,
          sccgId: candidate.sccgId,
        })),
        partners: partners.map(p => ({ id: p.id, companyName: p.companyName, email: p.email })),
        staff: users.map(u => ({ id: u.id, name: u.name, email: u.email })),
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load task board" };
  }
}

export async function saveSccgTaskAction(taskData: Partial<CandidateTask>) {
  try {
    const user = await requirePermission("candidate.create");
    const candidate = taskData.candidateId ? await Repository.candidates.getById(taskData.candidateId) : null;
    if (!candidate) return { success: false, error: "Select a valid candidate" };

    const allowedFlows: CandidateTaskFlow[] = ["candidate", "partner", "staff", "sccg"];
    const taskFlow: CandidateTaskFlow = allowedFlows.includes(taskData.taskFlow as CandidateTaskFlow)
      ? (taskData.taskFlow as CandidateTaskFlow)
      : "sccg";
    const payload: CandidateTask = {
      id: taskData.id || "",
      title: taskData.title?.trim() || "",
      description: taskData.description?.trim() || undefined,
      status: taskData.status || "todo",
      priority: taskData.priority || "medium",
      dueDate: taskData.dueDate,
      assignedTo: taskData.assignedTo,
      assignedToName: taskData.assignedToName,
      assignedToEmail: taskData.assignedToEmail,
      partnerId: candidate.partnerId,
      tags: taskData.tags || [],
      createdBy: taskData.createdBy || user.id,
      createdAt: taskData.createdAt || new Date().toISOString(),
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      taskCategory: taskData.taskCategory || "General Task",
      workflowCategory: taskData.workflowCategory || candidate.workflowCategory || "Others",
      taskFlow,
    };
    if (!payload.title) return { success: false, error: "Enter a task title" };

    let saved: CandidateTask;
    if (payload.id) {
      const existing = (await Repository.candidates.getAllTasks()).find((task) => task.id === payload.id);
      if (!existing || existing.taskFlow !== taskFlow) return { success: false, error: "Task not found" };
      await Repository.candidates.updateTask(payload.id, payload);
      saved = { ...existing, ...payload };
    } else {
      const { id: _id, ...newTask } = payload;
      saved = await Repository.candidates.addTask(newTask);
      await notifyTaskCreated(saved, candidate.email);
    }

    revalidatePath("/sccg/tasks");
    return { success: true, task: saved };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save task" };
  }
}

/**
 * On task creation, email the candidate (candidate flow) or notify the assigned
 * staff member in-app (staff flow). Best-effort — never blocks task creation.
 */
async function notifyTaskCreated(task: CandidateTask, candidateEmail?: string) {
  try {
    if (task.taskFlow === "candidate" && candidateEmail) {
      const { sendEmailViaGraph } = await import("@/lib/email");
      const rawPortalUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
      const portalUrl =
        rawPortalUrl && !rawPortalUrl.includes("localhost") && !rawPortalUrl.includes("127.0.0.1")
          ? rawPortalUrl.replace(/\/$/, "")
          : "https://portal.mysccg.de";
      await sendEmailViaGraph({
        to: candidateEmail,
        toName: task.candidateName || "Candidate",
        subject: `SCCG — New Task: ${task.title}`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Dear ${task.candidateName || "Candidate"},</p>
            <p>A new task has been assigned to you by SCCG Career Lab Germany:</p>
            <p style="font-size:16px;font-weight:600;">${task.title}</p>
            ${task.description ? `<p style="color:#475569;">${task.description}</p>` : ""}
            ${task.dueDate ? `<p><strong>Due:</strong> ${task.dueDate}</p>` : ""}
            <p><a href="${portalUrl}/login" style="color:#2563eb;">Open the SCCG Portal →</a></p>
            <p style="color:#64748b;font-size:13px;margin-top:24px;">Best regards,<br/><strong>SCCG Career Lab Germany</strong></p>
          </div>
        `,
      });
    } else if (task.taskFlow === "partner" && task.assignedToEmail) {
      const { sendEmailViaGraph } = await import("@/lib/email");
      const rawPortalUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
      const portalUrl = rawPortalUrl && !rawPortalUrl.includes("localhost") ? rawPortalUrl.replace(/\/$/, "") : "https://portal.mysccg.de";
      await sendEmailViaGraph({
        to: task.assignedToEmail,
        toName: task.assignedToName || "Partner",
        subject: `SCCG Partner — New Task: ${task.title}`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Dear ${task.assignedToName || "Partner"},</p>
            <p>A new task has been assigned to you by SCCG for candidate <strong>${task.candidateName}</strong>:</p>
            <p style="font-size:16px;font-weight:600;">${task.title}</p>
            ${task.description ? `<p style="color:#475569;">${task.description}</p>` : ""}
            ${task.dueDate ? `<p><strong>Due:</strong> ${task.dueDate}</p>` : ""}
            <p><a href="${portalUrl}/partner/tasks" style="color:#2563eb;">Open Partner Portal →</a></p>
            <p style="color:#64748b;font-size:13px;margin-top:24px;">Best regards,<br/><strong>SCCG Career Lab Germany</strong></p>
          </div>
        `,
      });
    } else if ((task.taskFlow === "staff" || task.taskFlow === "sccg") && task.assignedTo) {
      const { createNotification } = await import("@/lib/sharepoint");
      await createNotification({
        userId: task.assignedTo,
        userType: "admin",
        type: "general",
        title: `New task: ${task.title}`,
        message: task.description || `A task has been assigned to you${task.candidateName ? ` for ${task.candidateName}` : ""}.`,
        read: false,
        relatedId: task.id,
        createdAt: new Date().toISOString(),
      });
      
      // Also trigger email if email exists
      if (task.assignedToEmail) {
         const { sendEmailViaGraph } = await import("@/lib/email");
         const rawPortalUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
         const portalUrl = rawPortalUrl && !rawPortalUrl.includes("localhost") ? rawPortalUrl.replace(/\/$/, "") : "https://portal.mysccg.de";
         await sendEmailViaGraph({
           to: task.assignedToEmail,
           toName: task.assignedToName || "Staff",
           subject: `SCCG Staff — New Task: ${task.title}`,
           htmlBody: `
             <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
               <p>Hi ${task.assignedToName || "Team"},</p>
               <p>A new task has been assigned to you for candidate <strong>${task.candidateName}</strong>:</p>
               <p style="font-size:16px;font-weight:600;">${task.title}</p>
               ${task.description ? `<p style="color:#475569;">${task.description}</p>` : ""}
               ${task.dueDate ? `<p><strong>Due:</strong> ${task.dueDate}</p>` : ""}
               <p><a href="${portalUrl}/sccg/tasks" style="color:#2563eb;">Open Task Board →</a></p>
             </div>
           `,
         });
      }
    }
  } catch (err) {
    console.error("[sccg-tasks] notifyTaskCreated failed:", err);
  }
}

export async function updateSccgTaskStatusAction(taskId: string, taskFlow: CandidateTaskFlow, status: TaskStatus) {
  try {
    await requirePermission("candidate.create");
    const existing = (await Repository.candidates.getAllTasks()).find((task) => task.id === taskId);
    if (!existing || existing.taskFlow !== taskFlow) return { success: false, error: "Task not found" };
    await Repository.candidates.updateTask(taskId, { status });
    revalidatePath("/sccg/tasks");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update task" };
  }
}

export async function deleteSccgTaskAction(taskId: string, taskFlow: CandidateTaskFlow) {
  try {
    await requirePermission("candidate.create");
    const existing = (await Repository.candidates.getAllTasks()).find((task) => task.id === taskId);
    if (!existing || existing.taskFlow !== taskFlow) return { success: false, error: "Task not found" };
    await Repository.candidates.deleteTask(taskId);
    revalidatePath("/sccg/tasks");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete task" };
  }
}