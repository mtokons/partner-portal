"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { Repository } from "@/lib/repository";
import { getAllManagedUsers } from "@/lib/admin-users";
import { resolveCategory } from "@/lib/role-options";
import type { CandidateTask, CandidateTaskFlow, TaskStatus, TaskComment } from "@/types";

export async function fetchSccgTaskBoardDataAction() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const [candidates, tasks, partners, users] = await Promise.all([
      Repository.candidates.getAll().catch(() => []),
      Repository.candidates.getAllTasks().catch(() => []),
      Repository.partners.getAll().catch(() => []),
      getAllManagedUsers().catch(() => []),
    ]);

    const usersList = users || [];

    const adminUsers = usersList.filter((u: any) =>
      resolveCategory(u.category, u.primaryRole) === "sccg-admin"
    );

    const staffUsers = usersList.filter((u: any) =>
      resolveCategory(u.category, u.primaryRole) === "sccg-staff"
    );

    const partnerUsers = usersList.filter((u: any) =>
      resolveCategory(u.category, u.primaryRole) === "partner"
    );

    const combinedPartners = [
      ...(partners || []).map((p: any) => ({
        id: p.id,
        companyName: p.company || p.companyName || p.name || "",
        email: p.email,
      })),
      ...partnerUsers.map((u: any) => ({
        id: u.id,
        companyName: u.company || u.displayName || u.name || u.email,
        email: u.email,
      }))
    ];

    const uniquePartners = Array.from(new Map(combinedPartners.map(p => [p.email || p.id, p])).values());

    const staffMap = new Map(usersList.map((u: any) => [u.id, u.displayName || u.name || u.email]));
    const partnerMap = new Map(uniquePartners.map(p => [p.id, p.companyName || p.email]));

    const enrichedTasks = (tasks || []).map((t) => {
      let assignedToName = t.assignedToName;
      if (!assignedToName && t.assignedTo) {
        assignedToName = staffMap.get(t.assignedTo) || partnerMap.get(t.assignedTo) || t.assignedTo;
      }
      return {
        ...t,
        assignedToName,
      };
    });

    const allInternalStaff = [...adminUsers, ...staffUsers];

    return {
      success: true,
      data: {
        tasks: enrichedTasks,
        candidates: (candidates || []).map((candidate) => ({
          id: candidate.id,
          fullName: candidate.fullName,
          sccgId: candidate.sccgId,
        })),
        partners: uniquePartners,
        staff: allInternalStaff.map((u: any) => ({
          id: u.id,
          name: u.displayName || u.name || u.email,
          email: u.email,
          category: resolveCategory(u.category, u.primaryRole),
        })),
      },
    };
  } catch (error) {
    console.error("[fetchSccgTaskBoardDataAction] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load task board" };
  }
}

function revalidateAllTaskRoutes() {
  try {
    revalidatePath("/sccg/tasks");
    revalidatePath("/admin/tasks");
    revalidatePath("/partner/tasks");
  } catch (e) {
    // ignore in background contexts
  }
}

function getPortalUrl(): string {
  const rawPortalUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  return rawPortalUrl && !rawPortalUrl.includes("localhost") && !rawPortalUrl.includes("127.0.0.1")
    ? rawPortalUrl.replace(/\/$/, "")
    : "https://portal.mysccg.de";
}

/**
 * Send a Teams chat message via Graph API (best-effort).
 */
async function sendTeamsChatNotification(recipientEmail: string, subject: string, messageHtml: string) {
  try {
    const { getGraphClient } = await import("@/lib/graph");
    const client = await getGraphClient();

    const userRes = await client.api(`/users/${recipientEmail}`).select("id,displayName").get();
    if (!userRes?.id) return;

    const chatBody = {
      chatType: "oneOnOne",
      members: [
        {
          "@odata.type": "#microsoft.graph.aadUserConversationMember",
          roles: ["owner"],
          "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${process.env.MS_GRAPH_USER_ID || "portal@mysccg.de"}')`
        },
        {
          "@odata.type": "#microsoft.graph.aadUserConversationMember",
          roles: ["owner"],
          "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${userRes.id}')`
        }
      ]
    };

    const chat = await client.api("/chats").post(chatBody);
    if (!chat?.id) return;

    await client.api(`/chats/${chat.id}/messages`).post({
      body: {
        contentType: "html",
        content: `<b>${subject}</b><br/>${messageHtml}`
      }
    });
  } catch (err) {
    console.warn("[sccg-tasks] Teams chat notification skipped:", (err as Error)?.message || err);
  }
}

/**
 * Notify owner (task creator) and assignee when a task is created, edited, or commented on.
 * Sends email + Teams chat (if account available).
 */
async function notifyTaskActivity(
  task: CandidateTask,
  action: "created" | "edited" | "commented",
  actorName: string,
  extraHtml?: string,
  excludeEmail?: string,
) {
  try {
    const portalUrl = getPortalUrl();
    const { sendEmailViaGraph } = await import("@/lib/email");

    const recipients: Array<{ email: string; name: string }> = [];

    if (task.createdByEmail) {
      recipients.push({ email: task.createdByEmail, name: task.createdByName || "Task Owner" });
    }
    if (task.assignedToEmail && task.assignedToEmail !== task.createdByEmail) {
      recipients.push({ email: task.assignedToEmail, name: task.assignedToName || "Assignee" });
    }

    const actionLabel = action === "created" ? "New Task Created" : action === "edited" ? "Task Updated" : "New Comment on Task";
    const subject = `SCCG — ${actionLabel}: ${task.title}`;

    for (const recipient of recipients) {
      if (excludeEmail && recipient.email.toLowerCase() === excludeEmail.toLowerCase()) continue;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Hi ${recipient.name},</p>
          <p><strong>${actorName}</strong> ${
            action === "created" ? "created a new task" :
            action === "edited" ? "updated a task" :
            "added a comment on a task"
          }:</p>
          <div style="background:#f8fafc;border-left:4px solid #6366f1;padding:12px 16px;margin:12px 0;border-radius:4px;">
            <p style="font-size:16px;font-weight:600;margin:0 0 4px;">${task.title}</p>
            ${task.description ? `<p style="color:#475569;margin:4px 0;font-size:14px;">${task.description.slice(0, 200)}</p>` : ""}
            ${extraHtml || ""}
          </div>
          ${task.dueDate ? `<p><strong>Due:</strong> ${task.dueDate}</p>` : ""}
          <p><a href="${portalUrl}/sccg/tasks" style="color:#2563eb;font-weight:600;">Open Task Board →</a></p>
          <p style="color:#64748b;font-size:13px;margin-top:24px;">Best regards,<br/><strong>SCCG Career Lab Germany</strong></p>
        </div>
      `;

      await sendEmailViaGraph({
        to: recipient.email,
        toName: recipient.name,
        subject,
        htmlBody,
      }).catch((e: any) => console.warn("[sccg-tasks] Email failed:", e?.message));

      await sendTeamsChatNotification(
        recipient.email,
        `${actionLabel}: ${task.title}`,
        `<p>${actorName} ${action === "commented" ? "commented" : action} this task.${extraHtml ? " " + extraHtml.replace(/<[^>]+>/g, "") : ""}</p><a href="${portalUrl}/sccg/tasks">Open Task Board</a>`
      );
    }
  } catch (err) {
    console.error("[sccg-tasks] notifyTaskActivity failed:", err);
  }
}

export async function saveSccgTaskAction(taskData: Partial<CandidateTask>) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }
    const user = session.user;

    const allowedFlows: CandidateTaskFlow[] = ["candidate", "partner", "staff", "sccg"];
    const taskFlow: CandidateTaskFlow = allowedFlows.includes(taskData.taskFlow as CandidateTaskFlow)
      ? (taskData.taskFlow as CandidateTaskFlow)
      : "sccg";

    let candidate = null;
    if (taskData.candidateId) {
      candidate = await Repository.candidates.getById(taskData.candidateId).catch(() => null);
    }
    
    if (taskFlow === "candidate" && !candidate) {
      return { success: false, error: "Please select a valid candidate for Candidate Tasks" };
    }

    const payload: CandidateTask = {
      id: taskData.id || "",
      title: taskData.title?.trim() || "",
      description: taskData.description?.trim() || undefined,
      status: taskData.status || "backlog",
      priority: taskData.priority || "medium",
      dueDate: taskData.dueDate,
      assignedTo: taskData.assignedTo,
      assignedToName: taskData.assignedToName,
      assignedToEmail: taskData.assignedToEmail,
      partnerId: candidate?.partnerId || taskData.partnerId,
      tags: taskData.tags || [],
      createdBy: taskData.createdBy || user.id,
      createdByName: taskData.createdByName || (user as any).name || (user as any).displayName || user.email,
      createdByEmail: taskData.createdByEmail || user.email,
      createdAt: taskData.createdAt || new Date().toISOString(),
      candidateId: candidate?.id || taskData.candidateId || "",
      candidateName: candidate?.fullName || taskData.candidateName || "",
      taskCategory: taskData.taskCategory || "General Task",
      workflowCategory: taskData.workflowCategory || candidate?.workflowCategory || "Others",
      taskFlow,
      comments: taskData.comments || [],
    };
    if (!payload.title) return { success: false, error: "Enter a task title" };

    const isEdit = !!payload.id;
    let saved: CandidateTask;
    if (isEdit) {
      const existing = (await Repository.candidates.getAllTasks()).find((task) => task.id === payload.id);
      if (!existing) return { success: false, error: "Task not found" };
      payload.updatedAt = new Date().toISOString();
      if (!payload.comments?.length && existing.comments?.length) {
        payload.comments = existing.comments;
      }
      await Repository.candidates.updateTask(payload.id, payload);
      saved = { ...existing, ...payload };

      notifyTaskActivity(
        saved, "edited",
        (user as any).name || user.email || "Someone",
        undefined,
        user.email
      );
    } else {
      const { id: _id, ...newTask } = payload;
      saved = await Repository.candidates.addTask(newTask);

      notifyTaskActivity(
        saved, "created",
        (user as any).name || user.email || "Someone",
        undefined,
        user.email
      );
    }

    revalidateAllTaskRoutes();
    return { success: true, task: saved };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save task" };
  }
}

/**
 * Add a comment to an existing task.
 * Notifies the task owner and assignee via email + Teams chat.
 */
export async function addTaskCommentAction(taskId: string, commentText: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }
    const user = session.user;

    const allTasks = await Repository.candidates.getAllTasks();
    const existing = allTasks.find((t) => t.id === taskId);
    if (!existing) return { success: false, error: "Task not found" };

    const newComment: TaskComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorId: user.id,
      authorName: (user as any).name || (user as any).displayName || user.email || "Unknown",
      authorEmail: user.email || "",
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...(existing.comments || []), newComment];
    await Repository.candidates.updateTask(taskId, {
      comments: updatedComments,
      updatedAt: new Date().toISOString(),
    });

    const updatedTask = { ...existing, comments: updatedComments };

    notifyTaskActivity(
      updatedTask, "commented",
      newComment.authorName,
      `<p style="color:#334155;font-style:italic;">"${newComment.text.slice(0, 300)}"</p>`,
      user.email
    );

    revalidateAllTaskRoutes();
    return { success: true, comment: newComment };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add comment" };
  }
}

export async function updateSccgTaskStatusAction(taskId: string, status: TaskStatus) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }
    const existing = (await Repository.candidates.getAllTasks()).find((task) => task.id === taskId);
    if (!existing) return { success: false, error: "Task not found" };
    await Repository.candidates.updateTask(taskId, { status });
    revalidateAllTaskRoutes();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update task" };
  }
}

export async function deleteSccgTaskAction(taskId: string, _taskFlow?: CandidateTaskFlow) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }
    const existing = (await Repository.candidates.getAllTasks()).find((task) => task.id === taskId);
    if (!existing) return { success: false, error: "Task not found" };
    await Repository.candidates.deleteTask(taskId);
    revalidateAllTaskRoutes();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete task" };
  }
}