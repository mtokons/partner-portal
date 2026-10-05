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

    const userMap = new Map(usersList.map((u: any) => [u.id, u.displayName || u.name || u.email]));
    const userEmailMap = new Map(usersList.map((u: any) => [u.id, u.email]));

    const enrichedTasks = (tasks || []).map((t) => {
      let assignedToName = t.assignedToName;
      if (!assignedToName && t.assignedTo) {
        assignedToName = staffMap.get(t.assignedTo) || partnerMap.get(t.assignedTo) || userMap.get(t.assignedTo) || t.assignedTo;
      }
      let createdByName = t.createdByName;
      if (!createdByName && t.createdBy) {
        createdByName = userMap.get(t.createdBy) || staffMap.get(t.createdBy) || partnerMap.get(t.createdBy) || t.createdBy;
      }
      let createdByEmail = t.createdByEmail;
      if (!createdByEmail && t.createdBy) {
        createdByEmail = userEmailMap.get(t.createdBy);
      }
      return {
        ...t,
        assignedToName,
        createdByName: createdByName || "Admin",
        createdByEmail,
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
    revalidatePath("/expert/tasks");
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

    const senderEmail = process.env.O365_SENDER_USER_ID || process.env.MS_GRAPH_USER_ID || "portal@mysccg.de";
    const senderRes = await client.api(`/users/${senderEmail}`).select("id").get().catch(() => null);
    const senderId = senderRes?.id || senderEmail;

    const userRes = await client.api(`/users/${recipientEmail}`).select("id,displayName").get().catch(() => null);
    if (!userRes?.id) return;

    const chatBody = {
      chatType: "oneOnOne",
      members: [
        {
          "@odata.type": "#microsoft.graph.aadUserConversationMember",
          roles: ["owner"],
          "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${senderId}`
        },
        {
          "@odata.type": "#microsoft.graph.aadUserConversationMember",
          roles: ["owner"],
          "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${userRes.id}`
        }
      ]
    };

    const chat = await client.api("/chats").post(chatBody).catch(() => null);
    if (!chat?.id) return;

    await client.api(`/chats/${chat.id}/messages`).post({
      body: {
        contentType: "html",
        content: `<b>${subject}</b><br/>${messageHtml}`
      }
    }).catch(() => null);
  } catch (err) {
    console.warn("[sccg-tasks] Teams chat notification skipped:", (err as Error)?.message || err);
  }
}

/**
 * Helper to extract email addresses from text mentions like "@user@domain.com"
 * or match "@username" with a list of known users.
 */
function extractMentionedEmails(text: string): string[] {
  if (!text) return [];
  const emails = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
  return emails ? Array.from(new Set(emails)) : [];
}

/**
 * Notify owner (task creator) and assignee(s) when a task is created, edited, or commented on.
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

    // Fetch managed users to ensure missing emails can be resolved
    let allManagedUsers: any[] = [];
    try {
      const { getAllManagedUsers } = await import("@/lib/admin-users");
      allManagedUsers = await getAllManagedUsers();
    } catch (e) {}
    const userMapById = new Map(allManagedUsers.map((u: any) => [u.id, u]));
    const userMapByName = new Map(allManagedUsers.map((u: any) => [u.name?.toLowerCase() || u.displayName?.toLowerCase(), u]));

    const recipientsMap = new Map<string, string>(); // email -> name
    const explicitAssigneeEmails = new Set<string>();

    // 1. Task Owner
    if (task.createdByEmail) {
      recipientsMap.set(task.createdByEmail.toLowerCase(), task.createdByName || "Task Owner");
    }

    // 2. Assignee (Legacy single)
    if (task.assignedToEmail) {
      const e = task.assignedToEmail.toLowerCase();
      recipientsMap.set(e, task.assignedToName || "Assignee");
      explicitAssigneeEmails.add(e);
    } else if (task.assignedTo) {
      const matched = userMapById.get(task.assignedTo);
      if (matched?.email) {
        const e = matched.email.toLowerCase();
        recipientsMap.set(e, matched.displayName || matched.name || task.assignedToName || "Assignee");
        explicitAssigneeEmails.add(e);
      }
    }

    // 3. Assignees (Multiple)
    if (task.assignees && Array.isArray(task.assignees)) {
      task.assignees.forEach(assignee => {
        let email = assignee.email;
        if (!email && assignee.id) {
          const matched = userMapById.get(assignee.id);
          if (matched?.email) email = matched.email;
        }
        if (!email && assignee.name) {
          const matched = userMapByName.get(assignee.name.toLowerCase());
          if (matched?.email) email = matched.email;
        }
        if (email) {
          const lower = email.toLowerCase();
          recipientsMap.set(lower, assignee.name || "Assignee");
          explicitAssigneeEmails.add(lower);
        }
      });
    }

    // 4. Mentions in extraHtml (comments) or description
    const mentionedEmails = extractMentionedEmails((extraHtml || "") + " " + (task.description || ""));
    mentionedEmails.forEach(email => {
      if (!recipientsMap.has(email.toLowerCase())) {
        recipientsMap.set(email.toLowerCase(), "Mentioned User");
      }
    });

    const actionLabel = action === "created" ? "New Task Created" : action === "edited" ? "Task Updated" : "New Comment on Task";
    const subject = `SCCG — ${actionLabel}: ${task.title}`;

    for (const [email, name] of Array.from(recipientsMap.entries())) {
      // Don't exclude the creator if they explicitly assigned the task to themselves
      if (excludeEmail && email === excludeEmail.toLowerCase() && !explicitAssigneeEmails.has(email)) {
        continue;
      }

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: #4f46e5; padding: 20px; color: white;">
            <h2 style="margin: 0; font-size: 20px;">SCCG Task Notification</h2>
            <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${actionLabel}</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px; color: #1e293b;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 14px; color: #475569;"><strong>${actorName}</strong> ${
              action === "created" ? "created and assigned a new task to you" :
              action === "edited" ? "updated a task" :
              "added a comment on a task"
            }:</p>
            <div style="background:#f8fafc;border-left:4px solid #4f46e5;padding:14px 16px;margin:16px 0;border-radius:4px;">
              <p style="font-size:16px;font-weight:700;margin:0 0 6px;color:#1e293b;">${task.title}</p>
              ${task.description ? `<p style="color:#475569;margin:4px 0;font-size:14px;line-height:1.5;">${task.description.slice(0, 300)}</p>` : ""}
              ${extraHtml || ""}
            </div>
            ${task.dueDate ? `<p style="font-size: 13px; color: #64748b;"><strong>Due Date:</strong> ${task.dueDate}</p>` : ""}
            <div style="margin-top: 24px;">
              <a href="${portalUrl}/sccg/tasks" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;font-size:14px;">Open Task Board →</a>
            </div>
            <p style="color:#94a3b8;font-size:12px;margin-top:32px;border-top:1px solid #f1f5f9;padding-top:16px;">
              Sent by SCCG Career Lab Germany Portal
            </p>
          </div>
        </div>
      `;

      await sendEmailViaGraph({
        to: email,
        toName: name,
        subject,
        htmlBody,
      }).catch((e: any) => console.warn("[sccg-tasks] Email failed to " + email + ":", e?.message));

      await sendTeamsChatNotification(
        email,
        `${actionLabel}: ${task.title}`,
        `<p>${actorName} ${action === "commented" ? "commented on" : action} this task.${extraHtml ? " " + extraHtml.replace(/<[^>]+>/g, "") : ""}</p><a href="${portalUrl}/sccg/tasks">Open Task Board</a>`
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
      status: (taskData.status === "backlog" || !taskData.status) ? "todo" : (taskData.status as any), // Default to todo instead of backlog
      priority: taskData.priority || "medium",
      dueDate: taskData.dueDate,
      assignedTo: taskData.assignedTo, // Legacy
      assignedToName: taskData.assignedToName, // Legacy
      assignedToEmail: taskData.assignedToEmail, // Legacy
      assignees: taskData.assignees || [], // New multi-assignees
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
      saved = { ...existing, ...payload, assignees: (payload.assignees && payload.assignees.length > 0) ? payload.assignees : (existing.assignees || []) };

      await notifyTaskActivity(
        saved, "edited",
        (user as any).name || user.email || "Someone",
        undefined,
        user.email
      );
    } else {
      const { id: _id, ...newTask } = payload;
      const created = await Repository.candidates.addTask(newTask);
      saved = { ...newTask, ...created, assignees: (payload.assignees && payload.assignees.length > 0) ? payload.assignees : (created.assignees || []) };

      await notifyTaskActivity(
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

    await notifyTaskActivity(
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