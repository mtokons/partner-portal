"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getAllManagedUsers } from "@/lib/admin-users";
import { resolveCategory } from "@/lib/role-options";
import {
  getDevProjects,
  getDevWorkItems,
  saveDevProject,
  saveDevWorkItem,
  updateDevWorkItemStatus,
  deleteDevWorkItem,
  deleteDevProject,
} from "@/lib/dev-projects-db";
import type {
  DevProject,
  DevWorkItem,
  DevWorkItemStatus,
} from "@/types/dev-project";

export async function fetchDevBoardDataAction(projectKey?: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const [projects, workItems, users] = await Promise.all([
      getDevProjects(),
      getDevWorkItems(projectKey),
      getAllManagedUsers().catch(() => []),
    ]);

    const activeProjectKey = projectKey || projects[0]?.key || "PORTAL";
    const filteredItems = projectKey
      ? workItems.filter((i) => i.projectKey.toUpperCase() === projectKey.toUpperCase())
      : workItems;

    const assignableUsers = (users || []).map((u: any) => ({
      id: u.id,
      name: u.displayName || u.name || u.email,
      email: u.email,
      category: resolveCategory(u.category, u.primaryRole),
      company: u.company || "",
    }));

    return {
      success: true,
      data: {
        projects,
        activeProjectKey,
        workItems: filteredItems,
        users: assignableUsers,
      },
    };
  } catch (error) {
    console.error("[fetchDevBoardDataAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load project board",
    };
  }
}

export async function saveDevProjectAction(projectData: Partial<DevProject>) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const saved = await saveDevProject(projectData);
    revalidatePath("/sccg/dev-board");
    revalidatePath("/admin/dev-board");
    return { success: true, project: saved };
  } catch (error) {
    console.error("[saveDevProjectAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save project",
    };
  }
}

export async function saveDevWorkItemAction(itemData: Partial<DevWorkItem>) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (!itemData.reporterEmail) {
      itemData.reporterEmail = session.user.email || "";
      itemData.reporterName = session.user.name || session.user.email || "Reporter";
    }

    const saved = await saveDevWorkItem(itemData);

    // If assigned to a user with email, send notification (best-effort)
    if (saved.assignedToEmail && saved.assignedToEmail !== session.user.email) {
      try {
        const { sendEmailViaGraph } = await import("@/lib/email");
        const rawPortalUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
        const portalUrl =
          rawPortalUrl && !rawPortalUrl.includes("localhost")
            ? rawPortalUrl.replace(/\/$/, "")
            : "https://portal.mysccg.de";

        await sendEmailViaGraph({
          to: saved.assignedToEmail,
          toName: saved.assignedToName || "Team Member",
          subject: `[${saved.itemCode}] Assigned: ${saved.title}`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
              <h2 style="color: #2563eb; margin-top: 0;">DevOps & Project Work Item</h2>
              <p>You have been assigned a work item on <strong>${saved.projectKey}</strong>:</p>
              <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <p style="margin: 0; font-size: 13px; font-weight: bold; color: #64748b;">${saved.itemCode} · ${saved.type.toUpperCase()}</p>
                <h3 style="margin: 5px 0 10px 0; font-size: 16px; color: #0f172a;">${saved.title}</h3>
                ${saved.description ? `<p style="font-size: 14px; color: #334155; margin: 0;">${saved.description}</p>` : ""}
              </div>
              <p><strong>Priority:</strong> ${saved.priority.toUpperCase()} | <strong>Story Points:</strong> ${saved.storyPoints || 0}</p>
              ${saved.dueDate ? `<p><strong>Due Date:</strong> ${saved.dueDate}</p>` : ""}
              <p style="margin-top: 20px;">
                <a href="${portalUrl}/sccg/dev-board" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">Open Dev Board →</a>
              </p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.warn("[saveDevWorkItemAction] Email notification skipped:", mailErr);
      }
    }

    revalidatePath("/sccg/dev-board");
    revalidatePath("/admin/dev-board");
    return { success: true, item: saved };
  } catch (error) {
    console.error("[saveDevWorkItemAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save work item",
    };
  }
}

export async function updateDevWorkItemStatusAction(
  itemId: string,
  status: DevWorkItemStatus
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await updateDevWorkItemStatus(itemId, status);
    revalidatePath("/sccg/dev-board");
    revalidatePath("/admin/dev-board");
    return { success: true };
  } catch (error) {
    console.error("[updateDevWorkItemStatusAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status",
    };
  }
}

export async function deleteDevWorkItemAction(itemId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await deleteDevWorkItem(itemId);
    revalidatePath("/sccg/dev-board");
    revalidatePath("/admin/dev-board");
    return { success: true };
  } catch (error) {
    console.error("[deleteDevWorkItemAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete work item",
    };
  }
}

export async function deleteDevProjectAction(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await deleteDevProject(projectId);
    revalidatePath("/sccg/dev-board");
    revalidatePath("/admin/dev-board");
    return { success: true };
  } catch (error) {
    console.error("[deleteDevProjectAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete project",
    };
  }
}
