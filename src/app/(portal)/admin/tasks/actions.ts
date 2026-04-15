"use server";

import { auth } from "@/auth";
import type { SessionUser, KanbanTask, TaskStatus } from "@/types";
import {
  getKanbanTasks,
  createKanbanTask,
  updateKanbanTask,
  deleteKanbanTask,
  getPartners,
  getCustomers,
  getExperts,
} from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

// ── Helpers ──────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin access required");
  return user;
}

// ── Read ──────────────────────────────────────────────────────

export async function fetchTasksAction() {
  await requireAdmin();
  return getKanbanTasks();
}

/** Return a flat list of { id, name, email } for the assignee dropdown. */
export async function fetchAssigneesAction() {
  await requireAdmin();
  const [partners, customers, experts] = await Promise.all([
    getPartners(),
    getCustomers(),
    getExperts(),
  ]);

  const list: Array<{ id: string; name: string; email: string }> = [];
  partners.forEach((p) => list.push({ id: p.id, name: p.name, email: p.email }));
  customers.forEach((c) => list.push({ id: c.id, name: c.name, email: c.email }));
  experts.forEach((e) => list.push({ id: e.id, name: e.name, email: e.email }));
  return list;
}

// ── Mutations ──────────────────────────────────────────────────

export async function createTaskAction(data: {
  title: string;
  description?: string;
  priority: KanbanTask["priority"];
  dueDate?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToEmail?: string;
}) {
  const user = await requireAdmin();
  const now = new Date().toISOString();
  const task = await createKanbanTask({
    ...data,
    status: "todo",
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath("/admin/tasks");

  // Send assignment email if assigned
  if (data.assignedToEmail) {
    await sendAssignmentEmail(data.assignedToEmail, data.assignedToName || "", data.title, data.dueDate);
  }

  return task;
}

export async function updateTaskAction(
  id: string,
  data: Partial<Pick<KanbanTask, "title" | "description" | "priority" | "dueDate" | "assignedTo" | "assignedToName" | "assignedToEmail" | "status">>
) {
  await requireAdmin();

  // Detect assignee change
  let prevTask: KanbanTask | null = null;
  if (data.assignedTo !== undefined) {
    const allTasks = await getKanbanTasks();
    prevTask = allTasks.find((t) => t.id === id) || null;
  }

  const updated = await updateKanbanTask(id, data);
  revalidatePath("/admin/tasks");

  // Send email if assignee changed
  if (
    data.assignedToEmail &&
    prevTask &&
    data.assignedTo !== prevTask.assignedTo
  ) {
    await sendAssignmentEmail(
      data.assignedToEmail,
      data.assignedToName || "",
      updated?.title || "",
      updated?.dueDate
    );
  }

  return updated;
}

export async function moveTaskAction(id: string, newStatus: TaskStatus) {
  await requireAdmin();
  const updated = await updateKanbanTask(id, { status: newStatus });
  revalidatePath("/admin/tasks");
  return updated;
}

export async function deleteTaskAction(id: string) {
  await requireAdmin();
  await deleteKanbanTask(id);
  revalidatePath("/admin/tasks");
}

// ── Email via Microsoft Graph API ────────────────────────────

async function sendAssignmentEmail(
  toEmail: string,
  toName: string,
  taskTitle: string,
  dueDate?: string
) {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const senderEmail = process.env.GRAPH_MAIL_SENDER || "noreply@mysccg.de";

  if (!tenantId || !clientId || !clientSecret) {
    console.warn("[TaskBoard] Azure credentials not configured – skipping email.");
    return;
  }

  try {
    // 1. Obtain token via Client Credentials Flow
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      }
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[TaskBoard] Failed to obtain Graph token", tokenData);
      return;
    }

    // 2. Send mail
    const dueLine = dueDate
      ? `<p style="margin:0;color:#666;">📅 <strong>Due:</strong> ${new Date(dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>`
      : "";

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="margin:0;color:#111;">📋 New Task Assigned</h2>
          <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">SCCG Partner Portal</p>
        </div>
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111;">${taskTitle}</p>
          ${dueLine}
        </div>
        <p style="color:#374151;font-size:14px;">Hi ${toName || "there"},</p>
        <p style="color:#374151;font-size:14px;">You've been assigned a new task on the SCCG Portal. Log in to view details and track progress.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://portal.mysccg.de/admin/tasks" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">Open SCCG Planning Board →</a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">This is an automated notification from SCCG Portal.</p>
      </div>
    `;

    await fetch(
      `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: `📋 Task Assigned: ${taskTitle}`,
            body: { contentType: "HTML", content: html },
            toRecipients: [{ emailAddress: { address: toEmail, name: toName } }],
          },
          saveToSentItems: false,
        }),
      }
    );

    console.log(`[TaskBoard] Assignment email sent to ${toEmail}`);
  } catch (err) {
    console.error("[TaskBoard] Email send failed:", err);
  }
}
